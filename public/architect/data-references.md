# Data Engineering World — AWS behavior references

Research checked 2026-10-17. These references describe real AWS behavior; simulator costs, time, data sizes, SQL subset, IAM scope and concurrency are educational models, never AWS measurements. Consult the implementation README for supported operations.

## 1. S3 Versioning & Recovery

- A bucket starts unversioned; after versioning is enabled it can be Enabled or Suspended, not returned to an unversioned state. Enabling versioning does not recover data already overwritten. Existing objects retain their null version until changed. [S3 Versioning](https://docs.aws.amazon.com/AmazonS3/latest/userguide/Versioning.html)
- Enabled PUT adds a new numbered version. A suspended PUT creates/replaces the null version, preserving numbered versions. [Suspended PUT](https://docs.aws.amazon.com/AmazonS3/latest/userguide/AddingObjectstoVersionSuspendedBuckets.html)
- Suspended DELETE without version ID removes any null version and inserts a null delete marker; numbered versions remain. Deleting a specific version is permanent. [Suspended DELETE](https://docs.aws.amazon.com/AmazonS3/latest/userguide/DeletingObjectsfromVersioningSuspendedBuckets.html)
- GET without version ID returns 404 when current version is a delete marker. GET explicitly naming a marker returns 405; marker removal reveals an older version if one remains. [Delete markers](https://docs.aws.amazon.com/AmazonS3/latest/userguide/DeleteMarker.html)

## 2. S3 Event-Driven Pipeline

- S3 notifications are at least once and can arrive out of order; deduplicate using stable object/event identifiers, not arrival order. [Delivery semantics](https://docs.aws.amazon.com/AmazonS3/latest/userguide/notification-how-to-event-types-and-destinations.html)
- The Lambda resource policy authorizes S3 invocation. Its execution role separately authorizes S3 reads/writes. An output prefix that matches the input notification can recursively invoke the same function. [S3 and Lambda](https://docs.aws.amazon.com/lambda/latest/dg/with-s3.html)

## 3. Athena Data Lake

- Crawlers infer and write catalog metadata, not transformed source records. Separate include paths help distinguish tables with different schemas. [Crawler workflow](https://docs.aws.amazon.com/glue/latest/dg/add-crawler.html)
- Athena uses either a customer-owned result bucket or managed query results. Therefore a missing user S3 output location is not universally an error: it depends on workgroup configuration. Direct S3 GetObject access can expose results even without athena:GetQueryResults. [Query results](https://docs.aws.amazon.com/athena/latest/ug/querying.html)

## 4. Athena Optimization

- Partition pruning requires predicates compatible with the partition keys. Columnar formats allow reading selected columns; file metadata can skip irrelevant blocks. Many small files and excessively fragmented partitions add overhead. No universal rule makes Parquet cheaper for every small dataset/query. [Data optimization](https://docs.aws.amazon.com/athena/latest/ug/performance-tuning-data-optimization-techniques.html)
- CTAS and Glue ETL jobs can convert CSV into columnar formats. A crawler itself discovers metadata; it is not the conversion job. [Columnar storage and conversion](https://docs.aws.amazon.com/athena/latest/ug/columnar-storage.html)
- Distinguish estimated physical bytes, selected columns, matched partitions, files touched and query work. Do not present a model-derived byte count as official Athena billing.

## 5. Glue ETL and bookmarks

- S3 bookmarks use object last-modified times. Changed files may be processed again; bookmarks do not perform record-level deduplication. Bookmark state is job/transformation-context specific and is committed on successful job completion. Reset/rewind changes source progress, never cleans existing target files. [Bookmarks](https://docs.aws.amazon.com/glue/latest/dg/monitor-continuations.html)
- In a join, bookmarking both inputs can incorrectly omit unchanged dimension data needed by new facts. Apply bookmarks to intended incremental sources and read required reference data in full. [Transformation contexts](https://docs.aws.amazon.com/glue/latest/dg/programming-etl-connect-bookmarks.html)

## 6. Step Functions

- Retry applies before Catch; retriers/catchers are examined in listed order. MaxAttempts counts retries after the initial attempt. Backoff affects virtual time, not whether an operation succeeds. States.ALL must be alone and last and does not catch States.Runtime or States.DataLimitExceeded. States.TaskFailed does not match States.Timeout. [Error handling](https://docs.aws.amazon.com/step-functions/latest/dg/concepts-error-handling.html)
- Parallel gives each branch its own input copy and returns an array of branch results after all finish. Branches cannot transition outside their own state graph. An unhandled branch failure fails the Parallel state; already-running Lambda functions are not canceled automatically. [Parallel](https://docs.aws.amazon.com/step-functions/latest/dg/state-parallel.html)
- Inline Map iterates a JSON array, with at most 40 concurrent iterations in AWS. Distributed Map is a separate mode with child workflows and S3 input support. A sequential deterministic simulator trace should not claim real cloud concurrency. [Map](https://docs.aws.amazon.com/step-functions/latest/dg/state-map.html)

## 7. Redshift Loading

- COPY requires source access plus an existing target table and compatible data; UNLOAD exports an actual query result into S3. [COPY](https://docs.aws.amazon.com/redshift/latest/dg/r_COPY.html), [UNLOAD](https://docs.aws.amazon.com/redshift/latest/dg/r_UNLOAD.html)
- Parquet COPY is position-based with matching column counts and requires source bucket/database in the same region; it does not support every CSV COPY option. Treat a JSON-backed virtual Parquet representation as simulated, not a binary Parquet decoder. [Columnar COPY](https://docs.aws.amazon.com/redshift/latest/dg/copy-usage_notes-copy-from-columnar.html)
- DECIMAL(p,s) allows at most p−s integer digits. Input with excess fractional digits is rounded; integer overflow is an error. Decimal precision above JavaScript's exact number range needs fixed-point/string arithmetic or an explicitly limited simulation contract. [Numeric types](https://docs.aws.amazon.com/redshift/latest/dg/r_Numeric_types201.html)

## 8. Redshift Optimization

- EVEN distributes rows round-robin. KEY hashes values, so collocation needs compatible join keys/values, not merely two KEY labels. ALL replicates a table to each compute node and increases load/storage work. AUTO can select ALL, KEY or EVEN as table characteristics change. It is not intrinsically worse than manual KEY. [Distribution styles](https://docs.aws.amazon.com/redshift/latest/dg/c_choosing_dist_sort.html)
- DS_DIST_NONE: matching rows already collocated. DS_DIST_ALL_NONE: inner table replicated. DS_DIST_INNER/OUTER: corresponding side moves. DS_DIST_BOTH: both move. DS_BCAST_INNER: inner broadcast. ALL on the outer side can cause DS_DIST_ALL_INNER and single-slice work. Explain simulated plan choice from join keys and actual sample distribution, not a hardcoded UI selection. [Plan indicators](https://docs.aws.amazon.com/redshift/latest/dg/c_data_redistribution.html)
- ANALYZE updates statistics; VACUUM addresses physical sorting/deleted rows. Neither changes business results or automatically repairs an unsuitable distribution key.

## Official service icon provenance

The bundled `icons/athena.svg`, `glue.svg`, `stepfunctions.svg` and `redshift.svg` are unchanged official 64px service SVGs extracted from the AWS July 31, 2026 architecture icon package. Glue Crawler and Glue Catalog may use the Glue service icon; these are not invented dedicated AWS resource icons. [AWS Architecture Icons](https://aws.amazon.com/architecture/icons/)

Package URL: https://d1.awsstatic.com/onedam/marketing-channels/website/public/shared/architecture-icon-release/Icon-package_07312026.5846e92413caa21490223536cc97f1269e44fa92.zip
