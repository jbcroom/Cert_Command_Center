// One-time seed payload — read only by seed.js, never imported by the running app
export const certRegistry = [
  {
    id: 'dp-700',
    name: 'DP-700: Fabric Data Engineer Associate',
    vendor: 'Microsoft',
    exam_code: 'DP-700',
    exam_url: 'https://learn.microsoft.com/en-us/credentials/certifications/exams/dp-700/',
    type: 'exam',
    passing_score: 700,
    score_max: 1000,
    target_date: '2026-07-31',
    status: 'in_progress',
    year: 2026,
    color: '#0078D4',
    cost: 165,
    cost_paid: 0,
    registered: false,
    registration_date: null,
    voucher_notes: 'Free voucher received from Microsoft — confirm expiry before booking',
    resources: [
      { title: 'Microsoft Learn: DP-700 Study Guide', url: 'https://learn.microsoft.com/en-us/credentials/certifications/exams/dp-700/', type: 'official' },
      { title: 'Fabric Analytics Engineer Practice Assessment', url: 'https://learn.microsoft.com/en-us/credentials/certifications/practice-assessments-for-microsoft-certifications', type: 'practice' }
    ],
    domains: [
      { name: 'Implement and manage analytics solutions', weight: 35 },
      { name: 'Ingest and transform data', weight: 30 },
      { name: 'Monitor and optimize analytics solutions', weight: 20 },
      { name: 'Deploy and maintain data engineering solutions', weight: 15 }
    ],
    modules: []
  },
  {
    id: 'cdmp',
    name: 'CDMP Fundamentals',
    vendor: 'DAMA International',
    exam_code: 'CDMP',
    exam_url: 'https://www.dama.org/cpages/cdmp-certification',
    type: 'exam',
    passing_score: 70,
    score_max: 100,
    target_date: '2026-09-01',
    status: 'in_progress',
    year: 2026,
    color: '#7C3AED',
    cost: 311,
    cost_paid: 311,
    registered: false,
    registration_date: null,
    voucher_notes: null,
    resources: [
      { title: 'DAMA DMBOK2 Official Guide', url: 'https://www.dama.org/cpages/body-of-knowledge', type: 'official' },
      { title: 'CDMP Exam Prep', url: 'https://cdmp.info/', type: 'study' }
    ],
    domains: [
      { name: 'Data Governance', weight: 11 },
      { name: 'Data Quality', weight: 11 },
      { name: 'Data Architecture', weight: 6 },
      { name: 'Data Modeling & Design', weight: 11 },
      { name: 'Data Storage & Operations', weight: 6 },
      { name: 'Data Security', weight: 6 },
      { name: 'Reference & Master Data', weight: 6 },
      { name: 'Data Warehousing & BI', weight: 6 },
      { name: 'Document & Content Management', weight: 6 },
      { name: 'Metadata Management', weight: 6 },
      { name: 'Data Integration & Interoperability', weight: 6 },
      { name: 'Data Management Process', weight: 6 },
      { name: 'Big Data & Data Science', weight: 6 },
      { name: 'DMBOK Framework', weight: 6 }
    ],
    modules: []
  },
  {
    id: 'databricks-genai',
    name: 'Databricks Generative AI Engineer Associate',
    vendor: 'Databricks',
    exam_code: 'Databricks-GenAI',
    type: 'exam',
    passing_score: 70,
    score_max: 100,
    target_date: '2026-12-01',
    status: 'planned',
    year: 2026,
    color: '#FF3621',
    cost: null,
    cost_paid: null,
    domains: [],
    modules: []
  },
  {
    id: 'wharton-brain',
    name: 'Understanding the Brain: Neuroscience for Business',
    vendor: 'Wharton / Coursera',
    type: 'coursework',
    target_date: '2026-10-01',
    status: 'planned',
    year: 2026,
    color: '#003865',
    cost: null,
    cost_paid: null,
    domains: [],
    modules: [
      'Foundations of Neuroscience',
      'Decision Making & the Brain',
      'Emotion & Motivation',
      'Social Neuroscience',
      'Applications in Business',
      'Final Deliverable'
    ]
  },
  {
    id: 'wharton-influence',
    name: 'Executive Presence and Influence',
    vendor: 'Wharton / Coursera',
    type: 'coursework',
    target_date: '2026-11-01',
    status: 'planned',
    year: 2026,
    color: '#003865',
    cost: null,
    cost_paid: null,
    domains: [],
    modules: [
      'Foundations of Executive Presence',
      'Influence Without Authority',
      'Persuasive Communication',
      'Stakeholder Management',
      'Personal Brand',
      'Final Deliverable'
    ]
  },
  {
    id: 'mit-agentic-ai',
    name: 'Applied Agentic AI',
    vendor: 'MIT',
    type: 'coursework',
    target_date: '2026-12-01',
    status: 'planned',
    year: 2026,
    color: '#A31F34',
    cost: null,
    cost_paid: null,
    domains: [],
    modules: [
      'Agentic AI Foundations',
      'Agent Architectures',
      'Tool Use & Orchestration',
      'Safety & Alignment',
      'Enterprise Applications',
      'Capstone Project'
    ]
  },
  {
    id: 'aws-genai',
    name: 'AWS Generative AI (Self-Paced)',
    vendor: 'Amazon Web Services',
    type: 'exam',
    passing_score: 70,
    score_max: 100,
    target_date: '2026-12-31',
    status: 'planned',
    year: 2026,
    color: '#FF9900',
    cost: null,
    cost_paid: null,
    domains: [],
    modules: []
  },
  {
    id: 'mit-cto',
    name: 'Blended Professional Certificate: Chief Technology Officer',
    vendor: 'MIT',
    type: 'coursework',
    target_date: '2027-12-01',
    status: 'planned',
    year: 2027,
    color: '#A31F34',
    cost: null,
    cost_paid: null,
    domains: [],
    modules: [
      'Technology Strategy',
      'Innovation Management',
      'Leading Engineering Organizations',
      'Digital Transformation',
      'Residential Week 1',
      'AI & Emerging Technologies',
      'Product & Platform Thinking',
      'Executive Communication',
      'Residential Week 2',
      'Capstone'
    ]
  },
  {
    id: 'aws-sap-renewal',
    name: 'AWS Solutions Architect Professional (Renewal)',
    vendor: 'Amazon Web Services',
    exam_code: 'SAP-C02',
    type: 'exam',
    passing_score: 750,
    score_max: 1000,
    target_date: '2027-11-01',
    status: 'planned',
    year: 2027,
    color: '#FF9900',
    cost: null,
    cost_paid: null,
    domains: [],
    modules: []
  },
  {
    id: 'databricks-de-renewal',
    name: 'Databricks Data Engineering Associate (Renewal)',
    vendor: 'Databricks',
    type: 'exam',
    passing_score: 70,
    score_max: 100,
    target_date: '2027-06-01',
    status: 'planned',
    year: 2027,
    color: '#FF3621',
    cost: null,
    cost_paid: null,
    domains: [],
    modules: []
  }
]

export const flashcardSeedData = [
  // DP-700 flashcards
  {
    cert_id: 'dp-700',
    domain_name: 'Implement and manage analytics solutions',
    question: 'What is a Microsoft Fabric Lakehouse?',
    answer: 'A unified data platform that combines the flexibility of a data lake with the structure and query performance of a data warehouse, storing data in Delta format with ACID transactions.',
    difficulty: 'easy'
  },
  {
    cert_id: 'dp-700',
    domain_name: 'Implement and manage analytics solutions',
    question: 'What is the difference between a Lakehouse and a Warehouse in Microsoft Fabric?',
    answer: 'A Lakehouse uses Delta Parquet files and supports both SQL and Spark access; a Warehouse is a pure SQL experience with T-SQL, optimized for BI workloads. Lakehouses are schema-on-read, Warehouses are schema-on-write.',
    difficulty: 'medium'
  },
  {
    cert_id: 'dp-700',
    domain_name: 'Ingest and transform data',
    question: 'What are the two primary data ingestion methods in Microsoft Fabric pipelines?',
    answer: 'Copy Activity (for bulk data movement between sources and destinations) and Dataflow Gen2 (for low-code ETL/ELT transformations using Power Query).',
    difficulty: 'medium'
  },
  {
    cert_id: 'dp-700',
    domain_name: 'Ingest and transform data',
    question: 'What is a Shortcut in Microsoft Fabric?',
    answer: 'A symbolic link to external data sources (Azure Data Lake, S3, OneLake) that makes external data appear as if it lives in the Lakehouse without physically copying it.',
    difficulty: 'medium'
  },
  {
    cert_id: 'dp-700',
    domain_name: 'Monitor and optimize analytics solutions',
    question: 'What tool do you use to monitor Fabric capacity utilization?',
    answer: 'The Microsoft Fabric Capacity Metrics app — shows CU (Capacity Unit) consumption, throttling events, and per-workspace breakdowns.',
    difficulty: 'hard'
  },
  // CDMP flashcards
  {
    cert_id: 'cdmp',
    domain_name: 'Data Governance',
    question: 'What is the primary goal of Data Governance according to DMBOK?',
    answer: 'To exercise authority, control, and shared decision-making over the management of data assets. It defines who can take what actions, with what data, in what situations, using what methods.',
    difficulty: 'easy'
  },
  {
    cert_id: 'cdmp',
    domain_name: 'Data Governance',
    question: 'What is a Data Steward?',
    answer: 'A person responsible for managing data assets on behalf of the organization. Stewards ensure data quality, compliance, and proper use within their domain. They act as the bridge between business and IT.',
    difficulty: 'easy'
  },
  {
    cert_id: 'cdmp',
    domain_name: 'Data Quality',
    question: 'What are the six dimensions of data quality in DMBOK?',
    answer: 'Accuracy, Completeness, Consistency, Timeliness, Uniqueness, and Validity. Sometimes expanded to include Integrity and Accessibility depending on the framework version.',
    difficulty: 'medium'
  },
  {
    cert_id: 'cdmp',
    domain_name: 'Data Modeling & Design',
    question: 'What are the three levels of data modeling?',
    answer: 'Conceptual (high-level business entities and relationships), Logical (detailed attributes and normalized structure, technology-agnostic), Physical (implementation-specific, including indexes, constraints, and storage).',
    difficulty: 'medium'
  },
  {
    cert_id: 'cdmp',
    domain_name: 'Metadata Management',
    question: 'What is the difference between business metadata and technical metadata?',
    answer: 'Business metadata describes data in business terms (definitions, ownership, policies). Technical metadata describes the physical implementation (schemas, lineage, formats, storage locations).',
    difficulty: 'medium'
  }
]
