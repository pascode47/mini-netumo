1 Background and Rationale 
Commercial services such as Netumo keep websites healthy by: (i) performing round-the-clock 
HTTP pings to detect downtime, (ii) warning when SSL certificates or domain registrations are 
about to expire, and (iii) sending instant alerts through e-mail, SMS, Slack, WhatsApp and 
similar channels  
This capstone asks each group (3–5 students) to design, build and deploy a mini-Netumo that 
demonstrates the same core value-proposition, using the skills you have gained in Assignments 
1-4 (API design, Bash automation, Docker/Compose, high-availability front-ends). 
2 Learning Objectives 
By completing this project you will be able to 
1. Engineer a production-style micro-service that performs scheduled monitoring tasks 
and issues contextual notifications. 
2. Integrate certificate & WHOIS checks into a monitoring workflow. 
3. Automate CI/CD with container registries and GitHub Actions while staying inside 
AWS Free-Tier limits. 
4. Demonstrate group software-engineering practices: shared Git workflow, code-review 
etiquette and documented division of labour. 
3 Project Scope & Mandatory Features 
Layer 
Required capability 
Monitoring 
Worker 
Periodically (every 5 min) issue 
HTTP/HTTPS requests to each target 
URL; log status-code, latency and 
timestamp. 
Minimum technical 
expectations 
Use an asynchronous job 
queue (e.g., Celery + Redis or 
BullMQ) and back-off on 
repeated failures. 
Certificate & 
Domain Checks 
Once per day, query SSL validity 
(OpenSSL) and domain expiry 
(WHOIS). 
Persist days-to-expiry in the 
database and raise alerts when 
≤ 14 days remain. 
Notification 
Service 
Send alerts when (a) two successive 
downtime checks fail, or (b) 
SSL/domain threshold breached. 
E-mail via Mailtrap or SES 
and a webhook integration 
(Slack/Discord). 
REST/GraphQL 
API 
CRUD endpoints for /targets, 
/status/{id}, /history/{id}, /alerts. 
Secure with JWT; 
Swagger/OpenAPI spec 
required. 
Front-End 
Dashboard 
Display target list with colour-coded 
status, latency, SSL/domain countdown 
and a 24-h uptime chart. 
React (preferred) or Vue; show 
the responding front-end node 
ID as in Assignment 4. 
2 
Data Store 
Containerisation & 
Orchestration 
Any relational DB 
(MySQL/PostgreSQL). 
Docker Compose stack: load-balancer, 
2-3 front-end instances, API, worker, 
database, Redis/queue. 
Use connection pooling and 
daily backups. 
Health-checks, named 
volumes, environment 
overrides via .env. 
CI/CD & Ops 
GitHub Actions workflow that lints, 
tests, builds images, pushes to Docker 
Hub and redeploys EC2 instance on 
main-branch merge. 
Zero-downtime rolling update 
(blue-green or recreate 
strategy). 
4 Deliverables 
1. Design dossier (PDF, ≤ 6 pages) 
o System context diagram, component diagram, DB schema (ERD) and user
journey storyboard. 
o Risk & mitigation table (cost, security, availability). 
2. GitHub organisation (one per group) containing: 
o Source code, Dockerfiles, docker-compose.yml, load-balancer config, GitHub 
Action YAML. 
o Commit history evidencing meaningful contributions from every member. 
3. Live deployment 
o Public EC2 IPv4 / DNS exposing the load balancer (port 80/443). 
o API base URL linked in the README. 
4. Demo video (≤ 10 min, unlisted YouTube link) walking through features, failure 
simulation and alert reception. 
5. Artefact bundle e-mailed at submission: 
o screenshots/ — docker_ps.png, sample alert e-mail, Slack webhook 
screenshot. 
o logs/ — compressed log excerpts for monitoring, notifications and load
balancer. 
o db_backup.sql.gz — one automated backup file to prove backup routine. 
5 Evaluation Rubric 
Criterion 
Functional completeness (all mandatory features work) 
Reliability & fault-handling (graceful retries, no unhandled crashes) 
Weight 
40 % 
DevOps excellence (clean Dockerfiles, CI/CD pipeline, observability) 
20 % 
15 % 
User experience (front-end clarity, latency chart, error messaging) 
Documentation quality (README, design dossier, in-code comments) 10 % 
10 % 
Team process evidence (balanced commits, peer review logs) 
5 % 
Late submissions incur 5 % per 24 h penalty. Plagiarism will be penalised in line with UDOM 
regulations. 
3 
6 Operational Constraints & Tips 
• AWS Free-Tier only: one t3.micro (or t2.micro) + default 8–10 GB EBS. Optimise 
image sizes (multi-stage builds) and prune unused volumes. 
• Schedule heavy jobs (e.g., WHOIS queries) sparingly to respect rate limits. 
• Prefer Mailtrap, Send-in-Blue sandbox or SES sandbox for outgoing e-mail to avoid 
SMTP blocking. 
• Container logs must be rotated or piped to a lightweight aggregator (e.g., Loki via 
Grafana Cloud Free). 
• Use Terraform or CloudFormation only if your group has prior experience; otherwise 
stick to the provisioning model from Assignment 3. 
7 Group Formation & Reporting 
• Register teams by 22 May 2025—send member list + GitHub org link to the instructor. 
• Include in the design dossier a one-page responsibility matrix (RACI) mapping tasks to 
members. 
• Peer-assessment will adjust individual grades: each member will submit a confidential 
reflection (≤ 250 words) on teamwork and personal contribution. 
Harness the competencies you have steadily built this semester and showcase an end-to-end, 
production-style deployment that rivals entry-level SaaS monitors like Netumo. Good luck, and 
may your uptime be 100 %!