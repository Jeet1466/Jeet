import { Project, Subscriber, NewsletterCampaign, SystemConfig } from '../types';

export const INITIAL_PROJECTS: Project[] = [
  {
    id: 'proj-1',
    title: 'SDJIC Platform',
    subtitle: 'UI/UX _ FULLSTACK',
    category: 'Fullstack',
    description: 'Enterprise-grade interface architecture. Streamlined complex workflows into intuitive, high-performance dashboards for real-time decision making.',
    detailedOverview: 'Built to handle concurrent telemetric streams across municipal infrastructure nodes. Implements custom WebGL charts, virtualized data tables capable of rendering 100k+ rows at 60fps, and end-to-end WebSocket synchronization.',
    tags: ['REACT', 'NODE.JS', 'POSTGRES', 'WEBGL', 'TAILWIND'],
    metrics: {
      throughput: '124k req/sec',
      latency: '8.4ms p99',
      uptime: '99.99%',
      nodes: '64 clusters'
    },
    imageUrl: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1200&q=80',
    imageAlt: 'Sleek dark analytics dashboard with luminous yellow and gold charts',
    liveUrl: 'https://sdjic.example.org',
    githubUrl: 'https://github.com/system-architect/sdjic-platform',
    featured: true,
    gridSpan: 'wide',
    updatedAt: '2026-10-18'
  },
  {
    id: 'proj-2',
    title: 'PO Order System',
    subtitle: 'SYSTEMS _ BACKEND',
    category: 'Systems',
    description: 'High-throughput transactional engine ensuring zero-latency order processing and strict consistency across multi-region datastores.',
    detailedOverview: 'A distributed transactional pipeline utilizing Raft consensus and lock-free memory rings in Rust & Go. Features automatic failover under 50ms and comprehensive audit tracing.',
    tags: ['RUST', 'GO', 'KAFKA', 'REDIS', 'DOCKER'],
    metrics: {
      throughput: '450k tx/sec',
      latency: '2.1ms p99',
      uptime: '100%',
      nodes: '128 shards'
    },
    imageUrl: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=800&q=80',
    imageAlt: 'Server hardware with glowing LED indicators in dark rack',
    liveUrl: 'https://po-engine.example.internal',
    githubUrl: 'https://github.com/system-architect/po-order-core',
    featured: true,
    gridSpan: 'normal',
    updatedAt: '2026-10-24'
  },
  {
    id: 'proj-3',
    title: 'UrbanGate',
    subtitle: 'INFRASTRUCTURE',
    category: 'Infrastructure',
    description: 'Scalable microservices architecture supporting city-wide data aggregation and civic engagement portals with real-time telemetry streaming.',
    detailedOverview: 'Orchestrates 1,500+ IoT edge sensors and traffic monitoring gateways. Processes multi-modal sensor inputs with sub-second spatial aggregation and automated load dispatching.',
    tags: ['KUBERNETES', 'GRAPHQL', 'TIMESCALEDB', 'TERRAFORM', 'GCP'],
    metrics: {
      throughput: '890k events/sec',
      latency: '14.2ms p99',
      uptime: '99.98%',
      nodes: '1,492 online'
    },
    imageUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1600&q=80',
    imageAlt: 'Futuristic digital circuit and glowing city schematic matrix',
    liveUrl: 'https://urbangate.smartcity.io',
    githubUrl: 'https://github.com/system-architect/urbangate-mesh',
    featured: true,
    gridSpan: 'full',
    updatedAt: '2026-11-01'
  },
  {
    id: 'proj-4',
    title: 'Neural Sentinel',
    subtitle: 'AI _ INFERENCE',
    category: 'AI / ML',
    description: 'Edge-deployed multimodal transformer pipeline designed for autonomous anomaly detection in telemetry pipelines.',
    detailedOverview: 'Quantized INT8 inference engine operating at sub-5ms on client hardware. Intercepts anomalous telemetry data streams and flags degradation states before cascading failures occur.',
    tags: ['PYTORCH', 'ONNX', 'PYTHON', 'CUDA', 'FASTAPI'],
    metrics: {
      throughput: '58k tokens/sec',
      latency: '4.8ms',
      uptime: '99.95%',
      nodes: '32 GPU nodes'
    },
    imageUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1000&q=80',
    imageAlt: 'Cybernetic neural glowing synapses in deep dark void',
    liveUrl: 'https://sentinel-ai.internal',
    githubUrl: 'https://github.com/system-architect/neural-sentinel',
    featured: false,
    gridSpan: 'wide',
    updatedAt: '2026-10-12'
  }
];

export const INITIAL_SUBSCRIBERS: Subscriber[] = [
  {
    id: 'sub-1',
    name: 'Elena Rostova',
    email: 'elena.rostova@deeptech.io',
    topic: 'AI & Architecture',
    status: 'ACTIVE',
    subscribedAt: '2026-10-15 14:22'
  },
  {
    id: 'sub-2',
    name: 'Marcus Vance',
    email: 'm.vance@quantumcore.dev',
    topic: 'All Systems',
    status: 'ACTIVE',
    subscribedAt: '2026-10-19 09:10'
  },
  {
    id: 'sub-3',
    name: 'Dr. Sarah Chen',
    email: 'schen@mit-csail.edu',
    topic: 'Engineering Research',
    status: 'ACTIVE',
    subscribedAt: '2026-10-25 18:45'
  },
  {
    id: 'sub-4',
    name: 'Tetsuo Tanaka',
    email: 'tanaka@kinetic-tokyo.jp',
    topic: 'Kinetic UX',
    status: 'ACTIVE',
    subscribedAt: '2026-11-02 11:03'
  },
  {
    id: 'sub-5',
    name: 'Devon Miller',
    email: 'devon@cloudinfra.net',
    topic: 'All Systems',
    status: 'ACTIVE',
    subscribedAt: '2026-11-04 08:30'
  }
];

export const INITIAL_CAMPAIGNS: NewsletterCampaign[] = [
  {
    id: 'camp-1',
    subject: 'Dispatch #042: Sub-millisecond Telemetry & 3D Spatial Interfaces',
    previewText: 'Deconstructing real-time WebGL rendering bottlenecks in distributed cloud monitoring.',
    content: `## The Architecture of Kinetic Telemetry

In this dispatch, we explore how decoupling render passes from WebGL buffer synchronization yields an 84% reduction in main thread stall time.

Key takeaways:
- Ring buffers with SharedArrayBuffer for thread telemetry
- Custom WebGPU compute pipelines for vector transforms
- Eliminating frame drops under heavy analytical load

Full benchmarks and code samples available in the repository.`,
    targetTopic: 'All Systems',
    recipientCount: 1420,
    openRate: '54.2%',
    clickRate: '22.8%',
    status: 'SENT',
    sentAt: '2026-10-20 16:00'
  },
  {
    id: 'camp-2',
    subject: 'Dispatch #043: Autonomous Neural Agents in Production Workflows',
    previewText: 'Evaluating latency curves and safety guardrails in mission-critical developer tools.',
    content: `## Autonomous Agents: Beyond Prompt Engineering

Why state-machine grounding and formal verification are required when deploying neural agents to production infrastructure.

Topics covered:
1. Zero-hallucination function invocation schemas
2. Sandboxed execution boundaries
3. Human-in-the-loop audit telemetry`,
    targetTopic: 'AI & Architecture',
    recipientCount: 980,
    openRate: '61.4%',
    clickRate: '28.1%',
    status: 'SENT',
    sentAt: '2026-11-01 10:30'
  }
];

export const INITIAL_SYSTEM_CONFIG: SystemConfig = {
  ownerName: 'Jeet Patel',
  titleRoles: ['MScIT Student.', 'Engineer.', 'Researcher.', 'Architect.'],
  documentBio: 'Investigating high-performance computing, distributed interface architecture, and applied machine learning. Bridging mathematical rigor with kinetic, production-grade systems.',
  systemStatus: 'OPTIMAL',
  coreTemp: '42°C',
  activeNodes: 1492,
  latencyMs: 14,
  uptime: '99.99%',
  githubUrl: 'https://github.com',
  upworkUrl: 'https://upwork.com',
  linkedinUrl: 'https://linkedin.com',
  twitterUrl: 'https://x.com'
};
