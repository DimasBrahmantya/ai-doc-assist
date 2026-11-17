import type {
  ChatMessageItem,
  ConversationItemData,
  DocumentItem,
  MockUser,
} from '@/types';

export const MOCK_USER: MockUser = {
  id: 'user-demo-01',
  name: 'Dimas Pratama',
  email: 'dimas@example.com',
  initials: 'DP',
};

export const MOCK_DOCUMENTS: DocumentItem[] = [
  {
    id: 'doc-1',
    fileName: 'Q3_Financial_Report_2026.pdf',
    fileSizeBytes: 2_480_120,
    totalPages: 24,
    status: 'ready',
    createdAt: '2026-11-17T08:30:00Z',
    summary:
      'Quarterly financial performance report covering revenue growth, operating margin, regional breakdown, and Q4 outlook.',
  },
  {
    id: 'doc-2',
    fileName: 'Product_Architecture_Spec.pdf',
    fileSizeBytes: 1_845_000,
    totalPages: 18,
    status: 'ready',
    createdAt: '2026-11-16T15:10:00Z',
    summary:
      'System architecture specification detailing ingestion pipelines, vector indexing, authentication boundaries, and SLA targets.',
  },
  {
    id: 'doc-3',
    fileName: 'Employee_Handbook_v2.pdf',
    fileSizeBytes: 3_120_400,
    totalPages: 42,
    status: 'processing',
    createdAt: '2026-11-17T09:50:00Z',
    summary: 'Company policies, remote work guidelines, benefits, and onboarding procedures.',
  },
  {
    id: 'doc-4',
    fileName: 'Scanned_Invoice_004.pdf',
    fileSizeBytes: 890_200,
    totalPages: null,
    status: 'failed',
    createdAt: '2026-11-15T11:20:00Z',
    errorMessage: 'No selectable text detected. Please upload a text-based PDF.',
  },
  {
    id: 'doc-5',
    fileName: 'Research_Notes_Draft.pdf',
    fileSizeBytes: 640_500,
    totalPages: 9,
    status: 'uploaded',
    createdAt: '2026-11-17T10:05:00Z',
  },
];

export const MOCK_CONVERSATIONS: ConversationItemData[] = [
  {
    id: 'conv-1',
    title: 'Q3 revenue drivers and margin analysis',
    documentId: 'doc-1',
    documentName: 'Q3_Financial_Report_2026.pdf',
    group: 'TODAY',
    updatedAt: '10:12 AM',
    messageCount: 4,
  },
  {
    id: 'conv-2',
    title: 'Q4 guidance & risk factors summary',
    documentId: 'doc-1',
    documentName: 'Q3_Financial_Report_2026.pdf',
    group: 'TODAY',
    updatedAt: '09:20 AM',
    messageCount: 2,
  },
  {
    id: 'conv-3',
    title: 'Vector search latency and SLA targets',
    documentId: 'doc-2',
    documentName: 'Product_Architecture_Spec.pdf',
    group: 'YESTERDAY',
    updatedAt: 'Yesterday',
    messageCount: 2,
  },
  {
    id: 'conv-4',
    title: 'Authentication and RLS ownership rules',
    documentId: 'doc-2',
    documentName: 'Product_Architecture_Spec.pdf',
    group: 'EARLIER',
    updatedAt: 'Nov 12',
    messageCount: 0,
  },
];

export const MOCK_MESSAGES_BY_CONVERSATION: Record<string, ChatMessageItem[]> = {
  'conv-1': [
    {
      id: 'msg-1',
      conversationId: 'conv-1',
      role: 'user',
      content: 'What were the main drivers of Q3 revenue growth and operating margin?',
      createdAt: '10:10 AM',
    },
    {
      id: 'msg-2',
      conversationId: 'conv-1',
      role: 'assistant',
      content:
        'In Q3 2026, total revenue grew 24% year-over-year to $48.2M, primarily driven by enterprise subscription expansion (+31% YoY) and higher net dollar retention at 118% [p.4].\n\nOperating margin improved by 320 bps to 19.4% due to cloud infrastructure optimization and lower customer acquisition costs in the mid-market segment [p.12].',
      createdAt: '10:10 AM',
      feedback: 'like',
      citations: [
        {
          id: 'cit-1',
          page: 4,
          documentId: 'doc-1',
          fileName: 'Q3_Financial_Report_2026.pdf',
          snippet:
            'Total Q3 revenue reached $48.2M (+24% YoY). Enterprise ARR expanded 31% with net dollar retention holding steady at 118%.',
        },
        {
          id: 'cit-2',
          page: 12,
          documentId: 'doc-1',
          fileName: 'Q3_Financial_Report_2026.pdf',
          snippet:
            'Operating margin rose to 19.4% (+320 bps YoY), supported by a 14% reduction in unit compute cost and improved mid-market CAC payback.',
        },
      ],
    },
    {
      id: 'msg-3',
      conversationId: 'conv-1',
      role: 'user',
      content: 'Does the report mention the CEO bonus structure for 2027?',
      createdAt: '10:12 AM',
    },
    {
      id: 'msg-4',
      conversationId: 'conv-1',
      role: 'assistant',
      content:
        'The document does not contain enough information about the CEO bonus structure for 2027. It only covers Q3 2026 financial results, regional metrics, and Q4 2026 guidance.',
      createdAt: '10:12 AM',
      isInsufficientInfo: true,
      feedback: null,
    },
  ],
  'conv-2': [
    {
      id: 'msg-5',
      conversationId: 'conv-2',
      role: 'user',
      content: 'Summarize the Q4 2026 outlook.',
      createdAt: '09:18 AM',
    },
    {
      id: 'msg-6',
      conversationId: 'conv-2',
      role: 'assistant',
      content:
        'Management projects Q4 2026 revenue between $51.0M and $52.5M, assuming stable enterprise renewal rates and seasonal EMEA deal closures [p.19].',
      createdAt: '09:18 AM',
      citations: [
        {
          id: 'cit-3',
          page: 19,
          documentId: 'doc-1',
          fileName: 'Q3_Financial_Report_2026.pdf',
          snippet:
            'Q4 2026 Guidance: Revenue is expected in the range of $51.0M–$52.5M with non-GAAP operating margin of 19.5%–20.5%.',
        },
      ],
    },
  ],
  'conv-3': [
    {
      id: 'msg-7',
      conversationId: 'conv-3',
      role: 'user',
      content: 'What is the target p95 latency for vector retrieval?',
      createdAt: 'Yesterday',
    },
    {
      id: 'msg-8',
      conversationId: 'conv-3',
      role: 'assistant',
      content:
        'The target p95 latency for pgvector similarity search is under 120ms for top-k (k=8) retrieval with HNSW indexing enabled [p.7].',
      createdAt: 'Yesterday',
      citations: [
        {
          id: 'cit-4',
          page: 7,
          documentId: 'doc-2',
          fileName: 'Product_Architecture_Spec.pdf',
          snippet:
            'Vector retrieval SLA: p95 < 120ms for top-8 cosine similarity queries per user_id partition using HNSW index.',
        },
      ],
    },
  ],
  'conv-4': [],
};

export const MOCK_SUGGESTED_PROMPTS: string[] = [
  'Summarize the key takeaways of this document',
  'What are the main risks or limitations mentioned?',
  'List all numerical metrics and milestones cited',
];

export const MOCK_PDF_PAGES: Record<string, Record<number, string[]>> = {
  'doc-1': {
    1: [
      'Q3 2026 FINANCIAL PERFORMANCE REPORT',
      'Executive Summary & Highlights',
      'This report presents consolidated financial results for the third quarter ended September 30, 2026, including segment performance, margin analysis, and Q4 guidance.',
    ],
    4: [
      'Revenue Breakdown & Enterprise Growth',
      'Total Q3 revenue reached $48.2M (+24% YoY). Enterprise ARR expanded 31% with net dollar retention holding steady at 118%.',
      'North America contributed 62% of total bookings, while APAC grew 38% year-over-year.',
    ],
    12: [
      'Operating Margin & Cost Efficiency',
      'Operating margin rose to 19.4% (+320 bps YoY), supported by a 14% reduction in unit compute cost and improved mid-market CAC payback.',
      'Gross margin remained strong at 78.2% across all subscription tiers.',
    ],
    19: [
      'Q4 2026 Outlook & Guidance',
      'Q4 2026 Guidance: Revenue is expected in the range of $51.0M–$52.5M with non-GAAP operating margin of 19.5%–20.5%.',
      'Key assumptions include stable enterprise renewal cycles and planned seasonal EMEA closures.',
    ],
  },
  'doc-2': {
    1: [
      'PRODUCT ARCHITECTURE SPECIFICATION',
      'AI Document Assistant — Core RAG Pipeline',
      'This specification outlines the end-to-end architecture for secure PDF ingestion, embedding generation, and grounded question answering.',
    ],
    7: [
      'Vector Retrieval & Latency Targets',
      'Vector retrieval SLA: p95 < 120ms for top-8 cosine similarity queries per user_id partition using HNSW index.',
      'Minimum similarity threshold is enforced at 0.35 to prevent low-relevance context injection.',
    ],
  },
};
