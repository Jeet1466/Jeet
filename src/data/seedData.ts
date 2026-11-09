import { Project, Subscriber, NewsletterCampaign, SystemConfig } from '../types';

export const INITIAL_PROJECTS: Project[] = [
  {
    id: 'gh-101',
    title: 'EventSetu',
    subtitle: 'FULLSTACK _ COMMUNITY',
    category: 'Fullstack',
    description: 'A comprehensive event management platform connecting organizers, attendees, and vendors seamlessly with real-time updates and scheduling.',
    detailedOverview: 'Built with React, Node.js, and real-time WebSockets to coordinate vendor logistics, attendee ticketing, and schedule sync across complex hybrid events.',
    tags: ['TYPESCRIPT', 'REACT', 'NODE.JS', 'FULLSTACK', 'EVENTS'],
    metrics: {
      throughput: '42k req/min',
      latency: '12ms p99',
      uptime: '99.98%',
      nodes: '16 clusters'
    },
    imageUrl: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1200&q=80',
    imageAlt: 'Event tech conference and digital coordination hub',
    liveUrl: 'https://eventsetu.demo.app',
    githubUrl: 'https://github.com/Jeet1466/EventSetu',
    featured: true,
    gridSpan: 'wide',
    updatedAt: '2026-11-07',
    stars: 18,
    forks: 5,
    language: 'TypeScript',
    topics: ['fullstack', 'react', 'nodejs', 'events'],
    repoName: 'EventSetu',
    selected: true
  },
  {
    id: 'gh-102',
    title: 'SubSurf',
    subtitle: 'CYBERSECURITY _ RECON',
    category: 'Cybersecurity',
    description: 'Subdomain discovery and network intelligence tool designed for security researchers and web infrastructure developers.',
    detailedOverview: 'Asynchronous reconnaissance engine orchestrating passive OSINT scraping, DNS bruteforce resolution, and certificate transparency log mining with sub-second deduplication.',
    tags: ['PYTHON', 'CYBERSECURITY', 'DNS-RECON', 'OSINT', 'NETWORK'],
    metrics: {
      throughput: '8.5k queries/s',
      latency: '1.8ms avg',
      uptime: '100%',
      nodes: '8 threads'
    },
    imageUrl: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1000&q=80',
    imageAlt: 'Matrix code and network reconnaissance scanner terminal',
    liveUrl: undefined,
    githubUrl: 'https://github.com/Jeet1466/SubSurf',
    featured: true,
    gridSpan: 'normal',
    updatedAt: '2026-11-04',
    stars: 14,
    forks: 3,
    language: 'Python',
    topics: ['cybersecurity', 'subdomain-enum', 'python', 'recon'],
    repoName: 'SubSurf',
    selected: true
  },
  {
    id: 'gh-103',
    title: 'SphereWalk_Test',
    subtitle: '3D SPATIAL _ SIMULATION',
    category: 'Systems',
    description: 'Interactive 3D spatial simulation and pathfinding environment testing spherical geometry mechanics in real-time canvas.',
    detailedOverview: 'Implements non-Euclidean geodesic trajectory projection on arbitrary spherical meshes using low-level C++ math routines and real-time spatial partition bounding trees.',
    tags: ['C++', '3D-GRAPHICS', 'SIMULATION', 'GEOMETRY', 'OPENGL'],
    metrics: {
      throughput: '120 fps lock',
      latency: '0.8ms frame',
      uptime: '100%',
      nodes: 'Spatial Grid'
    },
    imageUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1000&q=80',
    imageAlt: '3D geometric spatial mesh wireframe simulation',
    liveUrl: undefined,
    githubUrl: 'https://github.com/Jeet1466/SphereWalk_Test',
    featured: true,
    gridSpan: 'normal',
    updatedAt: '2026-10-28',
    stars: 9,
    forks: 2,
    language: 'C++',
    topics: ['3d-graphics', 'simulation', 'cpp', 'geometry'],
    repoName: 'SphereWalk_Test',
    selected: true
  },
  {
    id: 'gh-104',
    title: 'MediaLoopTech',
    subtitle: 'INFRASTRUCTURE _ PIPELINE',
    category: 'Infrastructure',
    description: 'High-throughput automated media processing pipeline for video clipping, watermarking, and multi-platform publishing.',
    detailedOverview: 'Headless media streaming orchestration leveraging FFmpeg GPU hardware encoding, distributed worker queues, and automated webhook dispatching.',
    tags: ['JAVASCRIPT', 'FFMPEG', 'AUTOMATION', 'MEDIA', 'NODE.JS'],
    metrics: {
      throughput: '340 clips/hr',
      latency: '4.2s transcode',
      uptime: '99.95%',
      nodes: '8 GPU workers'
    },
    imageUrl: 'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?auto=format&fit=crop&w=1000&q=80',
    imageAlt: 'Automated video timeline and media rendering studio',
    liveUrl: 'https://medialoop.tech',
    githubUrl: 'https://github.com/Jeet1466/MediaLoopTech',
    featured: true,
    gridSpan: 'wide',
    updatedAt: '2026-11-08',
    stars: 22,
    forks: 7,
    language: 'JavaScript',
    topics: ['ffmpeg', 'automation', 'javascript', 'media'],
    repoName: 'MediaLoopTech',
    selected: true
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
    imageUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1000&q=80',
    imageAlt: 'Cybernetic neural glowing synapses in deep dark void',
    liveUrl: 'https://sentinel-ai.internal',
    githubUrl: 'https://github.com/Jeet1466/neural-sentinel',
    featured: true,
    gridSpan: 'wide',
    updatedAt: '2026-10-12',
    stars: 16,
    forks: 4,
    language: 'Python',
    topics: ['deep-learning', 'inference', 'edge-ai'],
    repoName: 'neural-sentinel',
    selected: true
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
