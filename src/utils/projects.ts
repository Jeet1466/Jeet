import { Project, ProjectCategory } from '../types';

/**
 * Infers category domain from repository metadata
 */
export function inferCategory(name: string, description: string, language: string): ProjectCategory {
  const n = name.toLowerCase();
  const d = (description || '').toLowerCase();
  const l = (language || '').toLowerCase();
  
  if (n.includes('cyber') || n.includes('subsurf') || d.includes('subdomain') || d.includes('security') || d.includes('recon')) {
    return 'Cybersecurity';
  }
  if (l === 'python' || n.includes('ai') || n.includes('ml') || d.includes('neural') || d.includes('model') || d.includes('intelligence')) {
    return 'AI / ML';
  }
  if (l === 'c++' || l === 'rust' || l === 'c' || n.includes('engine') || n.includes('kernel') || n.includes('sphere')) {
    return 'Systems';
  }
  if (n.includes('infra') || n.includes('docker') || n.includes('cloud') || n.includes('cluster')) {
    return 'Infrastructure';
  }
  return 'Fullstack';
}

export interface RepoLike {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  stargazers_count: number;
  forks_count: number;
  language: string | null;
  updated_at: string;
}

/**
 * Syncs incoming GitHub repositories with current projects without removing any current projects!
 * Updates stars, forks, and language on matching projects while preserving all manual projects and custom fields.
 */
export function syncGithubWithCurrentProjects(
  currentProjects: Project[],
  incomingRepos: RepoLike[]
): { updatedProjects: Project[]; updatedCount: number } {
  let updatedCount = 0;

  const updatedProjects = currentProjects.map((existingProject) => {
    const matchingRepo = incomingRepos.find(
      (r) =>
        (existingProject.repoName && r.full_name.toLowerCase() === existingProject.repoName.toLowerCase()) ||
        r.name.toLowerCase() === existingProject.title.toLowerCase() ||
        (existingProject.githubUrl && r.html_url.toLowerCase() === existingProject.githubUrl.toLowerCase())
    );

    if (matchingRepo) {
      updatedCount++;
      return {
        ...existingProject,
        stars: matchingRepo.stargazers_count,
        forks: matchingRepo.forks_count,
        updatedAt: matchingRepo.updated_at ? matchingRepo.updated_at.split('T')[0] : existingProject.updatedAt,
        language: existingProject.language || matchingRepo.language || undefined,
        repoName: matchingRepo.full_name,
        githubUrl: existingProject.githubUrl || matchingRepo.html_url,
      };
    }

    // Unmatched projects (e.g. manual projects or non-matching repos) are strictly preserved!
    return existingProject;
  });

  return { updatedProjects, updatedCount };
}
