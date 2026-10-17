/** @typedef {{id:string,type:string,x:number,y:number,config:Record<string,unknown>}} Node */
/** @typedef {{id:string,source:string,target:string}} Edge */
/** @typedef {{nodes:Node[],edges:Edge[]}} Graph */
export const clone=x=>JSON.parse(JSON.stringify(x));
export const rule=(from=443,to=from,cidr='0.0.0.0/0',action='allow',number=100)=>({protocol:'TCP',from,to,cidr,action,number});
const all=()=>[{protocol:'ALL',from:0,to:65535,cidr:'0.0.0.0/0',action:'allow',number:100}];
export const CATALOG={
 app:{name:'Chat application',group:'Ứng dụng',icon:null,desc:'Gửi câu hỏi tới model, Knowledge Base hoặc Agent.',config:{customerId:'A'}},
 model:{name:'Bedrock Model',group:'AI',icon:'bedrock',desc:'Sinh câu trả lời theo prompt và ngữ cảnh có sẵn; không tự biết tài liệu riêng.',config:{model:'nova-lite',prompt:'Chỉ trả lời dựa trên nguồn. Nếu không biết, nói không biết.'}},
 kb:{name:'Knowledge Base',group:'AI',icon:'bedrock',desc:'Điều phối ingest, chunking, embedding, index và retrieval. Mô phỏng KB truyền thống.',config:{chunkSize:100,overlap:20,topK:3,search:'semantic',filterYear:'',rerank:false}},
 embedding:{name:'Embedding Model',group:'AI',icon:'bedrock',desc:'Chuyển đoạn văn thành biểu diễn số. Số chiều phải khớp vector store.',config:{model:'titan-v2',dimensions:1024}},
 vector:{name:'Vector Store',group:'AI',icon:'vector',desc:'Lưu chỉ mục snapshot của các đoạn đã ingest. Mô hình OpenSearch hỗ trợ hybrid trong lab.',config:{dimensions:1024,hybrid:true}},
 s3:{name:'Amazon S3',group:'Storage',icon:'s3',desc:'Tài liệu nguồn có nội dung và phiên bản; sửa file không tự cập nhật index.',config:{documents:[{id:'return_policy_v1.txt',text:'Returns are allowed within 7 days. Policy CR-2026-001. Contact support for damaged items.',version:1,year:2026,owner:'public'}],notify:true,blockPublic:true,allowedDistribution:'D1'}},
 iam:{name:'AWS IAM role',group:'Security',icon:'iam',desc:'Nối role tới thành phần thực thi. Chỉ cấp những action cần thiết.',config:{allow:[],resource:'*'}},
 lambda:{name:'AWS Lambda',group:'Compute',icon:'lambda',desc:'Hàm đồng bộ Knowledge Base hoặc tra cứu đơn hàng. Kiểm tra quyền execution role.',config:{action:'sync',deduplicate:true,coalesce:true}},
 eventbridge:{name:'Amazon EventBridge',group:'Integration',icon:'eventbridge',desc:'Định tuyến sự kiện thay đổi object tới Lambda.',config:{enabled:true}},
 agent:{name:'Bedrock Agent',group:'AI',icon:'bedrock',desc:'Agent/action group cổ điển: chọn công cụ hoặc truy xuất kiến thức, không thay thế quyền dữ liệu.',config:{schema:'order_id',authorize:true}},
 dynamodb:{name:'Amazon DynamoDB',group:'Database',icon:'dynamodb',desc:'Tra cứu đơn theo partition key; trạng thái mô phỏng từ bản ghi thực trong lab.',config:{partitionKey:'order_id',items:[{order_id:'DH123',customer_id:'A',status:'SHIPPED',estimated_delivery:'2026-10-20'},{order_id:'DH999',customer_id:'B',status:'PROCESSING',estimated_delivery:'2026-10-22'}]}},
 guardrail:{name:'Bedrock Guardrails',group:'Security',icon:'bedrock',desc:'Lọc nội dung, tách biệt với kiểm tra IAM và quyền sở hữu đơn hàng.',config:{blockTopics:[],maskPII:true}},
 vpc:{name:'Amazon VPC',group:'Network',icon:'vpc',desc:'Biên mạng IPv4. Subnet phải thuộc CIDR VPC và không chồng lấn.',config:{cidr:'10.0.0.0/16'}},
 subnet:{name:'Subnet',group:'Network',icon:'subnet',desc:'Public/private được quyết định bởi route, không phải tên subnet.',config:{cidr:'10.0.1.0/24',az:'ap-southeast-1a'}},
 route:{name:'Route Table',group:'Network',icon:'route',desc:'Nối subnet → route table; target là ID node. Chọn route khớp dài nhất.',config:{routes:[]}},
 igw:{name:'Internet Gateway',group:'Network',icon:'igw',desc:'Gắn với VPC; internet inbound cần public IP và route hợp lệ.',config:{}},
 nat:{name:'NAT Gateway',group:'Network',icon:'nat',desc:'Public NAT: public subnet, EIP, route IGW. Chỉ cho kết nối khởi tạo từ bên trong.',config:{publicIp:'203.0.113.20',available:true}},
 sg:{name:'Security Group',group:'Security',icon:'vpc',desc:'Stateful, chỉ allow; gắn resource/ENI. Return traffic của kết nối đã chấp nhận được phép.',config:{inbound:[],outbound:all()}},
 nacl:{name:'Network ACL',group:'Security',icon:'vpc',desc:'Stateless tại biên subnet. Rule số nhỏ trước, return traffic cần rule riêng.',config:{inbound:all(),outbound:all()}},
 ec2:{name:'Amazon EC2',group:'Compute',icon:'ec2',desc:'Instance thuộc subnet. Public IP không tự mở firewall hay tạo route.',config:{ip:'10.0.1.10',publicIp:'',healthy:true}},
 client:{name:'Internet client',group:'Ứng dụng',icon:null,desc:'Nguồn request kiểm tra trong mission; không phải dịch vụ AWS.',config:{ip:'198.51.100.8'}},
 gateway:{name:'Gateway Endpoint',group:'Network',icon:'endpoint',desc:'Endpoint S3 hoặc DynamoDB; liên kết route table, không cần NAT.',config:{service:'s3',allow:true}},
 endpoint:{name:'Interface Endpoint',group:'Network',icon:'endpoint',desc:'ENI private, DNS và security group. Mô phỏng endpoint bedrock-runtime.',config:{service:'bedrock',privateDns:true,allow:true,ip:'10.0.2.50'}},
 dns:{name:'Route 53 zone',group:'Network',icon:'dns',desc:'Phân giải tên tách biệt với khả năng kết nối.',config:{scope:'public',domain:'shop.example',records:[{name:'shop.example',target:'203.0.113.10'}],vpcId:'vpc'}},
 cloudfront:{name:'Amazon CloudFront',group:'Network',icon:'cloudfront',desc:'Cache tại edge; chỉ MISS mới đọc origin.',config:{ttl:60,distribution:'D1'}},
 oac:{name:'Origin Access Control',group:'Security',icon:'cloudfront',desc:'Ký yêu cầu từ CloudFront đến S3; vẫn cần bucket policy.',config:{sign:true}},
 alb:{name:'Application Load Balancer',group:'Network',icon:'alb',desc:'HTTP/HTTPS, định tuyến host/path, hỗ trợ WAF.',config:{listenerProtocol:'HTTP',listenerPort:80,rules:[{path:'/api',host:'',target:'web'}],defaultTarget:'web'}},
 nlb:{name:'Network Load Balancer',group:'Network',icon:'nlb',desc:'TCP/UDP/TLS theo luồng mạng. Không gắn trực tiếp WAF.',config:{listenerProtocol:'TCP',listenerPort:443,defaultTarget:'web'}},
 waf:{name:'AWS WAF',group:'Security',icon:'waf',desc:'Web ACL với priority, lọc request HTTP; không thay thế SG/NACL.',config:{rules:[{priority:10,kind:'pattern',value:'UNION SELECT',action:'block'}]}}
};
const pairs={app:['model','kb','agent','guardrail'],s3:['kb','lambda','eventbridge'],kb:['embedding','model'],embedding:['vector'],iam:['kb','embedding','model','lambda','agent'],lambda:['kb','dynamodb'],eventbridge:['lambda'],agent:['lambda','kb'],vpc:['subnet','igw','dns'],subnet:['ec2','nat','endpoint','route'],route:['gateway'],sg:['ec2','endpoint'],nacl:['subnet'],gateway:['s3','dynamodb'],endpoint:['model'],cloudfront:['s3'],oac:['cloudfront'],alb:['ec2'],nlb:['ec2'],waf:['alb','cloudfront']};
export function connection(a,b){if(a.id===b.id)return 'Không thể tự nối node.';if(!pairs[a.type]?.includes(b.type))return a.type==='waf'&&b.type==='nlb'?'AWS WAF không hỗ trợ gắn trực tiếp vào NLB.':'Không tương thích: '+CATALOG[a.type].name+' → '+CATALOG[b.type].name;return '';}
export function node(type,id,x,y,config={}){return {id,type,x,y,config:{...clone(CATALOG[type].config),...config}};}
export function graph(nodes,links){return {nodes,edges:links.map(([source,target],i)=>({id:'e'+i,source,target}))};}
export function validateGraph(g){if(!g||!Array.isArray(g.nodes)||!Array.isArray(g.edges)||g.nodes.length>80||g.edges.length>160)throw Error('Kiến trúc không hợp lệ hoặc vượt giới hạn lab.');const ids=new Set();for(const n of g.nodes){if(!CATALOG[n.type]||typeof n.id!=='string'||ids.has(n.id)||!Number.isFinite(n.x)||!Number.isFinite(n.y)||!n.config||typeof n.config!=='object')throw Error('Node không hợp lệ.');ids.add(n.id);}for(const e of g.edges){const a=g.nodes.find(n=>n.id===e.source),b=g.nodes.find(n=>n.id===e.target);if(!a||!b||connection(a,b))throw Error('Kết nối không hợp lệ: '+e.source+' → '+e.target);}return true;}
