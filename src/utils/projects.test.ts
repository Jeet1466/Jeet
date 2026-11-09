import test from 'node:test';
import assert from 'node:assert/strict';
import { inferCategory, syncGithubWithCurrentProjects, RepoLike } from './projects';
import { Project } from '../types';

test('inferCategory accurately maps repository attributes to project categories', () => {
  assert.equal(inferCategory('subsurf-recon', 'DNS enumeration tool', 'Python'), 'Cybersecurity');
  assert.equal(inferCategory('neural-vision', 'Transformer model', 'Python'), 'AI / ML');
  assert.equal(inferCategory('sphere-kernel', 'Low level engine', 'Rust'), 'Systems');
  assert.equal(inferCategory('docker-cluster', 'Kubernetes manager', 'Go'), 'Infrastructure');
  assert.equal(inferCategory('web-portfolio', 'React client app', 'TypeScript'), 'Fullstack');
});

test('syncGithubWithCurrentProjects preserves all manual projects and updates matching ones', () => {
  const manualProject: Project = {
    id: 'proj-manual-1',
    title: 'Custom Proprietary Core',
    subtitle: 'SYSTEMS _ ARCHITECTURE',
    category: 'Systems',
    description: 'An internal custom high-performance storage engine',
    detailedOverview: 'Built from scratch without public repo',
    tags: ['C++', 'STORAGE'],
    metrics: { throughput: '1M IOPS' },
    imageUrl: 'https://example.com/img.png',
    featured: true,
    updatedAt: '2026-01-01',
    source: 'manual',
    selected: true,
  };

  const existingGithubProject: Project = {
    id: 'gh-101',
    title: 'EventSetu',
    subtitle: 'FULLSTACK _ ARCHITECTURE',
    category: 'Fullstack',
    description: 'Event platform',
    detailedOverview: 'Original overview',
    tags: ['REACT', 'NODE.JS'],
    metrics: { throughput: '10k' },
    imageUrl: 'https://example.com/eventsetu.png',
    githubUrl: 'https://github.com/Jeet1466/EventSetu',
    repoName: 'Jeet1466/EventSetu',
    featured: true,
    updatedAt: '2026-01-01',
    stars: 5,
    forks: 1,
    source: 'github',
    selected: true,
  };

  const incomingRepos: RepoLike[] = [
    {
      id: 999,
      name: 'EventSetu',
      full_name: 'Jeet1466/EventSetu',
      description: 'Updated event description from GitHub',
      html_url: 'https://github.com/Jeet1466/EventSetu',
      stargazers_count: 42,
      forks_count: 8,
      language: 'TypeScript',
      updated_at: '2026-11-09T12:00:00Z',
    },
    {
      id: 888,
      name: 'RandomUnrelatedRepo',
      full_name: 'Jeet1466/RandomUnrelatedRepo',
      description: 'Not yet in portfolio',
      html_url: 'https://github.com/Jeet1466/RandomUnrelatedRepo',
      stargazers_count: 10,
      forks_count: 2,
      language: 'Rust',
      updated_at: '2026-11-09T12:00:00Z',
    },
  ];

  const current = [manualProject, existingGithubProject];
  const { updatedProjects, updatedCount } = syncGithubWithCurrentProjects(current, incomingRepos);

  // CRITICAL REQUIREMENT: manual project MUST NOT be removed!
  assert.equal(updatedProjects.length, 2);
  assert.equal(updatedCount, 1);

  // Manual project is 100% untouched
  const manualFound = updatedProjects.find((p) => p.id === 'proj-manual-1');
  assert.ok(manualFound);
  assert.equal(manualFound?.title, 'Custom Proprietary Core');
  assert.equal(manualFound?.source, 'manual');

  // Existing github project has refreshed stars and forks
  const githubFound = updatedProjects.find((p) => p.id === 'gh-101');
  assert.ok(githubFound);
  assert.equal(githubFound?.stars, 42);
  assert.equal(githubFound?.forks, 8);
  assert.equal(githubFound?.updatedAt, '2026-11-09');
});
