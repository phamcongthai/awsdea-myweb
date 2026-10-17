// Educational IPv4 simulation. No AWS requests, credentials, timers or randomness.
// Sources: docs.aws.amazon.com/vpc/latest/userguide/{VPC_Internet_Gateway,
// vpc-security-groups,vpc-network-acls,subnet-route-tables}.html
// docs.aws.amazon.com/vpc/latest/privatelink/{gateway-endpoints,privatelink-access-aws-services}.html
export function ipv4(value) {
  if (typeof value !== 'string' || !/^\d{1,3}(\.\d{1,3}){3}$/.test(value)) return null;
  const p = value.split('.').map(Number);
  return p.some(x => x > 255) ? null : p.reduce((n, x) => n * 256 + x, 0);
}
export function cidr(value) {
  if (typeof value !== 'string') return null;
  const [ip, bits, extra] = value.split('/'), address = ipv4(ip), prefix = Number(bits);
  if (extra !== undefined || bits === undefined || !/^\d+$/.test(bits) || address === null || prefix < 0 || prefix > 32) return null;
  const size = 2 ** (32 - prefix), start = Math.floor(address / size) * size;
  return {start, end: start + size - 1, prefix, canonical: start === address};
}
export function contains(range, ip) {
  const c = cidr(range), n = ipv4(ip);
  return Boolean(c && n !== null && n >= c.start && n <= c.end);
}
const config = n => n?.config || {};
function matches(rule, packet, direction) {
  const proto = String(rule.protocol || 'TCP').toUpperCase();
  if (!['ALL', '-1', packet.protocol].includes(proto)) return false;
  const address = direction === 'inbound' ? packet.sourceIp : packet.destinationIp;
  if (!contains(rule.cidr || '0.0.0.0/0', address)) return false;
  return proto === 'ALL' || proto === '-1' || (packet.destinationPort >= Number(rule.from ?? rule.port ?? 0) && packet.destinationPort <= Number(rule.to ?? rule.from ?? rule.port ?? 65535));
}
export function runNetwork(graph, request = {}, runtime = {}) {
  if (['dns', 'cdn', 'balance', 'waf'].includes(request.mode)) return runWebNetwork(graph, request, runtime);
  const nodes = graph.nodes || [], edges = graph.edges || [], trace = [];
  const byId = id => nodes.find(n => n.id === id);
  const adjacent = (n, type) => nodes.filter(x => (!type || x.type === type) && edges.some(e => (e.source === n?.id && e.target === x.id) || (e.target === n?.id && e.source === x.id)));
  const emit = (n, stage, message, data, status = 'success') => trace.push({node: n?.id || 'network', stage, message, status, ...(data ? {data} : {})});
  const fail = (n, code, message, hint) => { throw {simulation: true, node: n?.id || 'network', code, message, hint, next: hint}; };
  const one = (n, type, code, message) => { const a = adjacent(n, type); if (a.length !== 1) fail(n, code, message, `Liên kết đúng một ${type} với ${n?.type || 'tài nguyên'}.`); return a[0]; };
  function membership(n) {
    const subnet = one(n, 'subnet', 'SUBNET_ASSOCIATION_INVALID', 'Tài nguyên phải thuộc đúng một subnet.');
    const vpc = one(subnet, 'vpc', 'VPC_ASSOCIATION_INVALID', 'Subnet phải thuộc đúng một VPC.');
    const a = cidr(config(vpc).cidr), b = cidr(config(subnet).cidr);
    if (!a || !b || !a.canonical || !b.canonical || a.prefix < 16 || a.prefix > 28 || b.prefix < 16 || b.prefix > 28 || b.start < a.start || b.end > a.end) fail(subnet, 'INVALID_CIDR', 'CIDR subnet/VPC không hợp lệ hoặc subnet nằm ngoài VPC.', 'Dùng CIDR IPv4 /16 đến /28, địa chỉ mạng chuẩn và subnet nằm trong VPC.');
    for (const other of adjacent(vpc, 'subnet')) {
      const c = cidr(config(other).cidr);
      if (other.id !== subnet.id && c && c.start <= b.end && c.end >= b.start) fail(other, 'OVERLAPPING_SUBNET', 'Hai subnet trong VPC bị trùng dải IP.', 'Chọn các CIDR subnet không giao nhau.');
    }
    const ip = config(n).ip;
    if (n.type === 'ec2' || n.type === 'endpoint') {
      const address = ipv4(ip);
      if (!contains(config(subnet).cidr, ip) || address < b.start + 4 || address === b.end) fail(n, 'INVALID_PRIVATE_IP', 'IP riêng không thuộc subnet hoặc là IP AWS dành riêng.', 'Dùng IP trong subnet, tránh 4 địa chỉ đầu và địa chỉ cuối.');
    }
    return {subnet, vpc};
  }
  function route(subnet, vpc, destination) {
    const table = one(subnet, 'route', 'ROUTE_TABLE_ASSOCIATION_INVALID', 'Subnet chưa được liên kết đúng một route table.');
    const routes = config(table).routes || [];
    for (const r of routes) if (!cidr(r.destination)) fail(table, 'INVALID_ROUTE_CIDR', 'Destination route phải là IPv4 CIDR.', 'Gateway endpoint liên kết trực tiếp với route table; route thường dùng CIDR.');
    const choices = [...routes, {destination: config(vpc).cidr, target: 'local'}].filter(r => contains(r.destination, destination)).sort((a, b) => cidr(b.destination).prefix - cidr(a.destination).prefix);
    if (!choices.length) fail(table, 'NO_MATCHING_ROUTE', `Không có route đến ${destination}.`, 'Kiểm tra destination và target trong route table.');
    const chosen = choices[0]; emit(table, 'route', 'Chọn route khớp dài nhất (longest prefix).', chosen);
    return {table, chosen, target: byId(chosen.target)};
  }
  function acl(subnet, direction, packet) {
    const acls = adjacent(subnet, 'nacl');
    if (acls.length > 1) fail(subnet, 'NACL_ASSOCIATION_INVALID', 'Một subnet chỉ có một NACL.', 'Bỏ liên kết NACL dư.');
    if (!acls.length) { emit(subnet, `nacl-${direction}`, 'Dùng default NACL allow-all (mặc định mô phỏng).', packet); return; }
    const nacl = acls[0], rules = [...(config(nacl)[direction] || [])].sort((a, b) => Number(a.number ?? 100) - Number(b.number ?? 100));
    const found = rules.find(r => matches(r, packet, direction));
    if (!found || found.action === 'deny') fail(nacl, `NACL_${direction.toUpperCase()}_DENY`, `NACL ${direction} chặn cổng đích ${packet.destinationPort}${found ? ` bởi rule ${found.number}` : ' bởi implicit deny'}.`, 'NACL stateless: kiểm tra cả chiều đi và cổng ephemeral của chiều về, rule số nhỏ xét trước.');
    emit(nacl, `nacl-${direction}`, `ALLOW rule ${found.number ?? 100}; cổng đích ${packet.destinationPort}.`, packet);
  }
  function sg(n, direction, packet) {
    const groups = adjacent(n, 'sg');
    for (const group of groups) if ((config(group)[direction] || []).some(r => r.action === 'deny')) fail(group, 'INVALID_SG_DENY_RULE', 'Security Group không hỗ trợ deny rule.', 'Dùng allow rules cho SG; cần explicit deny hãy dùng NACL.');
    const allow = groups.find(g => (config(g)[direction] || []).some(r => matches(r, packet, direction)));
    if (!allow) fail(groups[0] || n, 'SECURITY_GROUP_DENY', `Không có SG allow ${direction} cổng ${packet.destinationPort}.`, 'Liên kết SG và thêm allow theo protocol, CIDR, cổng đích.');
    emit(allow, `sg-${direction}`, 'ALLOW; SG tạo connection tracking cho chiều trả lời.', packet);
  }
  const reverse = p => ({sourceIp: p.destinationIp, destinationIp: p.sourceIp, sourcePort: p.destinationPort, destinationPort: p.sourcePort, protocol: p.protocol});
  function igwCheck(igw, vpc) {
    if (igw?.type !== 'igw' || !adjacent(vpc, 'igw').some(n => n.id === igw.id)) fail(igw || vpc, 'INTERNET_GATEWAY_NOT_ATTACHED', 'Route không đến IGW gắn với VPC này.', 'Gắn IGW vào đúng VPC và đặt route target đến IGW đó.');
    emit(igw, 'internet-gateway', 'IGW gắn đúng VPC; chuyển địa chỉ IPv4 công khai.');
  }
  try {
    const instance = request.instanceId ? byId(request.instanceId) : nodes.find(n => n.type === 'ec2');
    if (!instance || instance.type !== 'ec2') fail(instance, 'INSTANCE_NOT_FOUND', 'Chưa chọn EC2 để thử kết nối.', 'Thêm EC2 và chọn instance trong yêu cầu.');
    const {subnet, vpc} = membership(instance), mode = request.mode || 'inbound';
    let packet = {sourceIp: mode === 'inbound' ? (request.sourceIp || '198.51.100.8') : config(instance).ip, destinationIp: mode === 'inbound' ? config(instance).ip : (request.destinationIp || '1.1.1.1'), sourcePort: Number(request.sourcePort ?? 49152), destinationPort: Number(request.destinationPort ?? 443), protocol: String(request.protocol || 'TCP').toUpperCase()};
    if (!['inbound', 'outbound', 'service'].includes(mode) || !['TCP', 'UDP'].includes(packet.protocol) || [packet.sourceIp, packet.destinationIp].some(x => ipv4(x) === null) || [packet.sourcePort, packet.destinationPort].some(x => !Number.isInteger(x) || x < 1 || x > 65535)) fail(instance, 'INVALID_PACKET', 'Gói tin không hợp lệ; mô phỏng hỗ trợ TCP/UDP IPv4.', 'Kiểm tra địa chỉ IPv4 và cổng 1–65535.');
    emit(instance, 'packet', 'Bắt đầu mô phỏng một kết nối và chiều trả lời.', packet);
    emit(subnet, 'membership', 'IP EC2 thuộc subnet và VPC hợp lệ.', {subnet: config(subnet).cidr, vpc: config(vpc).cidr});
    let path = 'internet', target;
    if (mode === 'inbound') {
      if (ipv4(config(instance).publicIp) === null) fail(instance, 'PUBLIC_IP_REQUIRED', 'EC2 không có public IPv4; internet không thể chủ động kết nối trực tiếp.', 'Cấp public IP cho EC2 public; giữ EC2 private không có public IP.');
      const r = route(subnet, vpc, packet.sourceIp); target = r.target;
      if (target?.type !== 'igw') fail(r.table, 'NO_DIRECT_INBOUND_ROUTE', 'Route chiều trả lời không qua IGW; NAT không nhận kết nối internet chủ động.', 'Kiểm tra route subnet public tới IGW.');
      igwCheck(target, vpc); acl(subnet, 'inbound', packet); sg(instance, 'inbound', packet);
      emit(instance, 'application', `Dịch vụ mô phỏng nhận ${packet.protocol}/${packet.destinationPort}.`);
      emit(instance, 'sg-return', 'SG stateful cho phép response dù không có outbound allow.');
      acl(subnet, 'outbound', reverse(packet));
    } else {
      const table = one(subnet, 'route', 'ROUTE_TABLE_ASSOCIATION_INVALID', 'Subnet cần route table.');
      let gateway = mode === 'service' ? adjacent(table, 'gateway').find(n => config(n).service === request.service) : null;
      let endpoint = mode === 'service' ? nodes.find(n => n.type === 'endpoint' && config(n).service === request.service && adjacent(n, 'subnet').some(s => adjacent(s, 'vpc').some(v => v.id === vpc.id))) : null;
      if (gateway) {
        if (!['s3', 'dynamodb'].includes(request.service)) fail(gateway, 'UNSUPPORTED_GATEWAY_SERVICE', 'Gateway endpoint chỉ hỗ trợ S3/DynamoDB trong lab.', 'Dùng interface endpoint cho dịch vụ phù hợp khác.');
        packet.destinationIp = request.destinationIp || (request.service === 's3' ? '52.216.0.1' : '52.94.0.1');
        sg(instance, 'outbound', packet); acl(subnet, 'outbound', packet);
        emit(table, 'prefix-list-route', 'Route managed prefix list đến gateway endpoint; không cần NAT/IGW.', {service: request.service, target: gateway.id});
        if (config(gateway).allow === false) fail(gateway, 'ENDPOINT_POLICY_DENY', 'Gateway endpoint policy từ chối yêu cầu.', 'Cho phép action/resource trong endpoint policy; quyền IAM vẫn là điều kiện độc lập.');
        target = adjacent(gateway, request.service)[0];
        if (!target) fail(gateway, 'ENDPOINT_SERVICE_DISCONNECTED', 'Gateway chưa nối đúng dịch vụ đích.', 'Nối gateway endpoint tới service tương ứng.');
        path = 'gateway-endpoint'; emit(gateway, 'endpoint-policy', 'Endpoint policy cho phép; không có SG trên gateway endpoint.');
      } else if (endpoint) {
        const e = membership(endpoint);
        if (!config(endpoint).privateDns && !request.endpointDns) fail(endpoint, 'DNS_RESOLUTION_FAILED', 'Tên dịch vụ công khai chưa phân giải về private IP của endpoint.', 'Bật private DNS hoặc dùng endpoint-specific DNS (endpointDns=true).');
        if (config(vpc).dnsSupport === false || (config(endpoint).privateDns && config(vpc).dnsHostnames === false)) fail(vpc, 'DNS_RESOLUTION_FAILED', 'DNS support/hostnames của VPC chưa bật.', 'Bật DNS support và DNS hostnames cho private DNS.');
        packet.destinationIp = config(endpoint).ip; emit(endpoint, 'dns', 'Tên dịch vụ phân giải về ENI private IP.', {ip: packet.destinationIp});
        sg(instance, 'outbound', packet);
        const r = route(subnet, vpc, packet.destinationIp);
        if (r.chosen.target !== 'local') fail(r.table, 'ENDPOINT_ROUTE_INVALID', 'Route đến endpoint ENI bị chuyển khỏi local VPC.', 'Kiểm tra route cụ thể ghi đè đường local.');
        if (e.subnet.id !== subnet.id) { acl(subnet, 'outbound', packet); acl(e.subnet, 'inbound', packet); }
        sg(endpoint, 'inbound', packet);
        if (config(endpoint).allow === false) fail(endpoint, 'ENDPOINT_POLICY_DENY', 'Interface endpoint policy từ chối yêu cầu.', 'Kiểm tra endpoint policy và quyền IAM riêng biệt.');
        const back = reverse(packet);
        emit(endpoint, 'sg-return', 'Endpoint SG cho phép response nhờ connection tracking.');
        if (e.subnet.id !== subnet.id) { acl(e.subnet, 'outbound', back); acl(subnet, 'inbound', back); }
        target = adjacent(endpoint).find(n => n.type === request.service || config(n).service === request.service && n.id !== endpoint.id);
        if (!target) fail(endpoint, 'ENDPOINT_SERVICE_DISCONNECTED', 'Interface endpoint chưa nối dịch vụ.', 'Nối endpoint tới dịch vụ được chọn.');
        path = 'interface-endpoint';
      } else {
        sg(instance, 'outbound', packet); acl(subnet, 'outbound', packet);
        const r = route(subnet, vpc, packet.destinationIp); target = r.target;
        if (target?.type === 'igw') {
          if (ipv4(config(instance).publicIp) === null) fail(instance, 'PUBLIC_IP_REQUIRED', 'IGW không tự cấp public IP cho EC2 private.', 'Dùng NAT public cho EC2 private hoặc cấp public IP cho EC2 public.');
          igwCheck(target, vpc);
        } else if (target?.type === 'nat') {
          if (config(target).available === false || ipv4(config(target).publicIp) === null) fail(target, 'NAT_GATEWAY_UNAVAILABLE', 'Public NAT chưa sẵn sàng hoặc thiếu Elastic IP.', 'Đặt NAT available và gán public IPv4.');
          const nat = membership(target);
          if (nat.vpc.id !== vpc.id) fail(target, 'NAT_VPC_MISMATCH', 'NAT nằm ở VPC khác.', 'Dùng NAT trong cùng VPC của bài lab.');
          acl(nat.subnet, 'inbound', packet);
          const nr = route(nat.subnet, nat.vpc, packet.destinationIp); igwCheck(nr.target, nat.vpc);
          // NAT translates source into its subnet private address before IGW maps its EIP.
          const ip = config(target).ip || config(nat.subnet).cidr.split('/')[0].replace(/\.\d+$/, '.5');
          const translated = {...packet, sourceIp: ip}; acl(nat.subnet, 'outbound', translated);
          emit(target, 'nat', 'NAT tạo mapping cho kết nối đi ra; không nhận kết nối mới từ internet.', {privateSource: packet.sourceIp, translatedPublicIp: config(target).publicIp, sourcePort: packet.sourcePort});
          acl(nat.subnet, 'inbound', reverse(translated)); acl(nat.subnet, 'outbound', reverse(packet)); path = 'nat';
        } else fail(r.table, 'NO_MATCHING_ROUTE', 'Route không dẫn tới IGW/NAT phù hợp cho internet.', 'Kiểm tra route target và gateway đang tồn tại.');
      }
      if (mode === 'service' && request.privateOnly && !['gateway-endpoint', 'interface-endpoint'].includes(path)) fail(target, 'PRIVATE_ENDPOINT_REQUIRED', 'Luồng hiện tại dùng public service endpoint qua NAT/IGW.', 'Cấu hình gateway/interface endpoint để tránh đường public.');
      if (mode === 'service' && (config(instance).serviceAllow === false || config(target).allow === false)) fail(target || instance, 'SERVICE_ACCESS_DENIED', 'Quyền dịch vụ/IAM hoặc resource policy từ chối dù mạng thông.', 'Kiểm tra serviceAllow của EC2 và allow ở dịch vụ; endpoint policy không tự cấp quyền IAM.');
      if (path !== 'interface-endpoint') acl(subnet, 'inbound', reverse(packet));
      emit(instance, 'sg-return', 'EC2 SG stateful cho phép gói trả lời; NACL vẫn kiểm tra độc lập.');
    }
    emit(instance, 'complete', 'Kết nối hai chiều thành công — kết quả mô phỏng.', {path});
    return {status: 'success', output: {message: 'Kết nối thành công (mô phỏng)', packet, path, response: '200 OK', service: request.service || null}, trace, runtime};
  } catch (error) {
    if (!error.simulation) throw error;
    emit({id: error.node}, 'failure', error.message, {code: error.code, hint: error.hint}, 'error');
    return {status: 'failure', output: {message: error.message, simulation: true}, trace, runtime, error};
  }
}

// Application delivery model: DNS/cache state is persisted only in returned runtime.
// Deliberately bounded: HTTP content and TCP forwarding, not TLS cryptography or real latency.
function runWebNetwork(graph, request, previous) {
  const runtime = JSON.parse(JSON.stringify(previous || {})), trace = [], nodes = graph.nodes || [], edges = graph.edges || [];
  const get = id => nodes.find(n => n.id === id);
  const links = (n, type) => nodes.filter(x => (!type || x.type === type) && edges.some(e => e.source === n?.id && e.target === x.id || e.target === n?.id && e.source === x.id));
  const log = (n, stage, message, data) => trace.push({node:n?.id || 'network',stage,message,status:'success',data});
  const stop = (n, code, message, hint) => { throw {simulation:true,node:n?.id || 'network',code,message,hint,next:hint}; };
  const now = Number(request.now ?? runtime.clock ?? 0); runtime.clock = now + 1;
  const success = output => ({status:'success',output:{simulation:true,...output},trace,runtime});
  function waf(resource) {
    for (const w of links(resource,'waf')) {
      const rules = [...(config(w).rules || [])].sort((a,b)=>Number(a.priority || 0)-Number(b.priority || 0));
      for (const r of rules) {
        let match = false;
        if (r.kind === 'ip') match = contains(r.value,request.sourceIp || '198.51.100.8');
        if (r.kind === 'pattern') match = `${request.path || '/'} ${request.body || ''}`.toLowerCase().includes(String(r.value || '').toLowerCase());
        if (r.kind === 'rate') {
          runtime.rates ||= {}; const key = `${w.id}:${r.priority}:${request.sourceIp || '198.51.100.8'}`;
          const times = (runtime.rates[key] || []).filter(t=>t>now-Number(r.window || 60)); times.push(now); runtime.rates[key]=times;
          match = times.length>Number(r.limit || 100);
          log(w,'waf-rate','Đếm yêu cầu/IP trong cửa sổ mô phỏng; AWS thật có cơ chế ước lượng khác.',{count:times.length,limit:Number(r.limit || 100)});
        }
        if (match) {
          log(w,'waf-rule',`Khớp rule ưu tiên ${r.priority}: ${r.action}.`,r);
          if (r.action === 'block') stop(w,'WAF_BLOCKED_REQUEST','WAF chặn HTTP request theo rule đã cấu hình.','Xem IP, nội dung hoặc số yêu cầu và rule ưu tiên.');
          if (r.action === 'allow') return;
        }
      }
      if (config(w).defaultAction === 'block') stop(w,'WAF_BLOCKED_REQUEST','WAF default action là block.','Thêm allow rule phù hợp hoặc sửa default action.');
      log(w,'waf','HTTP request được phép qua web ACL.');
    }
  }
  try {
    if (request.mode === 'dns') {
      const domain = String(request.domain || '').toLowerCase().replace(/\.$/,'');
      runtime.dnsCache ||= {}; const key = `${request.vpcId || 'public'}:${domain}`;
      const cached = runtime.dnsCache[key];
      if (cached && cached.expires>now && !request.flushDns) { log(get(cached.zone),'dns-cache','Resolver trả bản ghi còn TTL.',cached);return success({answer:cached.answer,cache:'HIT',expires:cached.expires}); }
      const zones = nodes.filter(n=>n.type==='dns' && (domain===config(n).domain || domain.endsWith(`.${config(n).domain}`)) && (config(n).scope!=='private' || request.vpcId && (config(n).vpcId===request.vpcId || links(n,'vpc').some(v=>v.id===request.vpcId)))).sort((a,b)=>Number(config(b).scope==='private')-Number(config(a).scope==='private') || config(b).domain.length-config(a).domain.length);
      const zone=zones[0]; if (!zone) stop(null,'DNS_RESOLUTION_FAILED','Không tìm thấy hosted zone có thể truy cập từ vị trí hiện tại.','Private hosted zone chỉ phục vụ VPC liên kết; dùng public zone cho internet.');
      const record=(config(zone).records || []).find(r=>String(r.name).toLowerCase().replace(/\.$/,'')===domain || (r.name==='@' && domain===config(zone).domain));
      if (!record) stop(zone,'DNS_RESOLUTION_FAILED','NXDOMAIN: zone được chọn không có bản ghi; không tự fallback sang public zone.','Thêm record đúng tên vào zone phù hợp.');
      if (record.type==='CNAME' && domain===config(zone).domain) stop(zone,'INVALID_DNS_RECORD','CNAME không được dùng ở zone apex.','Dùng Alias cho tài nguyên AWS được hỗ trợ.');
      const target=get(record.target), answer=target ? config(target).publicIp || config(target).ip || `${target.id}.simulated.aws` : record.target || record.value;
      if (!answer) stop(zone,'DNS_RESOLUTION_FAILED','Bản ghi chưa có đích.','Điền target IP, hostname hoặc ID tài nguyên.');
      runtime.dnsCache[key]={zone:zone.id,answer,expires:now+Math.max(0,Number(record.ttl ?? 60))};
      log(zone,'dns-resolve','Phân giải bản ghi; DNS không tự cấp quyền truy cập mạng.',{domain,answer,scope:config(zone).scope,type:record.type || 'A'});
      return success({answer,cache:'MISS',expires:runtime.dnsCache[key].expires});
    }
    const resource=request.resourceId ? get(request.resourceId) : nodes.find(n=>request.mode==='cdn' ? n.type==='cloudfront' : request.mode==='balance' ? ['alb','nlb'].includes(n.type) : ['cloudfront','alb'].includes(n.type));
    if (!resource) stop(null,'RESOURCE_NOT_FOUND','Chưa có tài nguyên nhận request.','Thêm CloudFront hoặc Load Balancer và chọn resourceId.');
    if (request.mode==='cdn' && request.directS3) {
      if (resource.type!=='s3') stop(resource,'INVALID_ORIGIN','Yêu cầu truy cập S3 trực tiếp phải chọn bucket.','Đặt resourceId là ID S3 origin.');
      log(resource,'direct-s3','Client truy cập S3 trực tiếp, không có chữ ký OAC của CloudFront.');
      if (config(resource).blockPublic!==false) stop(resource,'S3_DIRECT_ACCESS_DENIED','S3 private từ chối yêu cầu công khai trực tiếp.','Truy cập qua CloudFront được OAC và bucket policy cho phép; giữ Block Public Access.');
      const path=request.path || '/index.html', objects=config(resource).objects || {}, body=objects[path] ?? objects[path.replace(/^\//,'')];
      if (body===undefined) stop(resource,'NO_SUCH_KEY','Object không tồn tại trong S3.','Kiểm tra path và objects của bucket.');
      log(resource,'public-object','Đọc object công khai trực tiếp trong mô hình bucket public của lab.',{path,body});
      return success({body,cache:'BYPASS',response:'200 OK',directS3:true});
    }
    waf(resource);
    if (request.mode==='waf') { if (!links(resource,'waf').length) stop(resource,'WAF_NOT_ASSOCIATED','Tài nguyên chưa có web ACL.','Liên kết WAF với CloudFront hoặc ALB.');return success({message:'WAF cho phép yêu cầu',response:'200 OK'}); }
    if (resource.type==='cloudfront') {
      const path=request.path || '/index.html', key=`${resource.id}:${path}`; runtime.cdnCache ||= {};
      if (request.invalidate) { for (const k of Object.keys(runtime.cdnCache)) if (k.startsWith(`${resource.id}:`) && (request.invalidate==='/*' || k===`${resource.id}:${request.invalidate}`)) delete runtime.cdnCache[k]; log(resource,'invalidation','Đã xóa cache path được chọn trong mô phỏng.',{path:request.invalidate}); }
      const cached=runtime.cdnCache[key];
      if (cached && cached.expires>now) {log(resource,'cache','Cache HIT: trả nội dung từ edge, không đọc lại S3.',cached);return success({body:cached.body,cache:'HIT',response:'200 OK'});}
      log(resource,'cache','Cache MISS: chuyển yêu cầu tới origin.');
      const bucket=links(resource,'s3')[0]; if (!bucket) stop(resource,'ORIGIN_NOT_CONNECTED','CloudFront chưa có S3 origin.','Nối CloudFront với S3 REST origin.');
      const oac=links(resource,'oac')[0];
      if (config(bucket).blockPublic!==false && (!oac || config(oac).sign!==true || config(bucket).allowedDistribution!==(config(resource).distribution || resource.id))) stop(bucket,'CLOUDFRONT_ORIGIN_ACCESS_DENIED','Origin private từ chối: thiếu OAC ký hoặc bucket policy sai distribution.','Giữ Block Public Access; bật OAC signing và cho phép đúng distribution trong bucket policy.');
      log(oac || bucket,'origin-access',oac ? 'OAC ký yêu cầu; bucket policy cho phép distribution.' : 'Đọc origin public trong mô phỏng.');
      const objects=config(bucket).objects || {}, body=objects[path] ?? objects[path.replace(/^\//,'')];
      if (body===undefined) stop(bucket,'NO_SUCH_KEY','Object không tồn tại trong origin.','Kiểm tra path và danh sách objects của S3.');
      runtime.cdnCache[key]={body,expires:now+Math.max(0,Number(config(resource).ttl ?? 60))};
      log(bucket,'origin-read','Đọc object và lưu bản sao tại edge.',{path,body});return success({body,cache:'MISS',response:'200 OK'});
    }
    if (!['alb','nlb'].includes(resource.type)) stop(resource,'INVALID_LOAD_BALANCER','Tài nguyên không phải ALB/NLB.','Chọn đúng load balancer.');
    const c=config(resource), protocol=String(request.protocol || (resource.type==='alb'?'HTTP':'TCP')).toUpperCase();
    if (Number(request.destinationPort ?? c.listenerPort ?? 80)!==Number(c.listenerPort ?? 80) || protocol!==String(c.listenerProtocol || (resource.type==='alb'?'HTTP':'TCP')).toUpperCase()) stop(resource,'LISTENER_NOT_FOUND','Không có listener khớp protocol/port.','Đổi listener hoặc request protocol/port.');
    if (resource.type==='nlb' && (c.rules || []).some(r=>r.path || r.host)) stop(resource,'UNSUPPORTED_L7_ROUTING','NLB không dùng HTTP host/path để chọn target.','Dùng ALB cho host/path routing; NLB chuyển kết nối TCP/UDP/TLS.');
    const rules=[...(c.rules || [])].sort((a,b)=>Number(a.priority || 0)-Number(b.priority || 0));
    const rule=resource.type==='alb' ? rules.find(r=>(!r.path || (request.path || '/').startsWith(r.path.replace(/\*$/,''))) && (!r.host || r.host===request.host)) : null;
    const targetIds=rule?.targets || (rule?.target ? [rule.target] : c.targets || (c.defaultTarget ? [c.defaultTarget] : []));
    const candidates=targetIds.map(get).filter(n=>n && links(resource,'ec2').some(x=>x.id===n.id));
    if (!candidates.length) stop(resource,'TARGET_GROUP_EMPTY','Không có target đã đăng ký cho listener rule.','Điền target ID và nối LB với EC2 tương ứng.');
    const healthy=candidates.filter(n=>config(n).healthy!==false), chosen=(healthy.length ? healthy : candidates)[(runtime.balanceCounter || 0)%(healthy.length || candidates.length)];runtime.balanceCounter=(runtime.balanceCounter || 0)+1;
    log(resource,'listener','Listener chọn target theo rule và health check.',{rule:rule || 'default',target:chosen.id,healthy:healthy.map(n=>n.id)});
    if (!healthy.length) { log(resource,'fail-open','Tất cả target unhealthy: LB fail-open tới target đã đăng ký; ứng dụng mô phỏng không trả lời.');stop(chosen,'TARGET_UNHEALTHY','Target unhealthy, không có phản hồi ứng dụng.','Khôi phục sức khỏe ứng dụng/health check; LB không tự sửa backend.'); }
    const targetPacket={protocol:'TCP',sourceIp:resource.type==='alb' ? (c.ip || '10.0.1.5') : (request.sourceIp || '198.51.100.8'),destinationIp:config(chosen).ip || '10.0.2.10',destinationPort:Number(c.targetPort || 80),sourcePort:49152};
    const groups=links(chosen,'sg');
    if (!groups.some(g=>(config(g).inbound || []).some(r=>r.action!=='deny' && matches(r,targetPacket,'inbound')))) stop(groups[0] || chosen,'SECURITY_GROUP_DENY','Backend SG không cho phép traffic từ load balancer/client.',`Cho phép cổng ${targetPacket.destinationPort} từ ${targetPacket.sourceIp}; ALB tạo kết nối mới tới backend.`);
    log(chosen,'application','Backend nhận request và trả nội dung.',targetPacket);
    return success({response:'200 OK',target:chosen.id,body:config(chosen).body || `Phản hồi từ ${chosen.id}`,message:'Listener → healthy target → response (mô phỏng)'});
  } catch(error) {
    if (!error.simulation) throw error;
    trace.push({node:error.node,stage:'failure',status:'error',message:error.message,data:{code:error.code,hint:error.hint}});
    return {status:'failure',output:{simulation:true,message:error.message},trace,runtime,error};
  }
}
