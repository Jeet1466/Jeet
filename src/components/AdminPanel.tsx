/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useApp } from '../data/store';
import { Project, ProjectCategory } from '../types';
import { inferCategory, syncGithubWithCurrentProjects } from '../utils/projects';
import {
  FolderGit2,
  CheckSquare,
  Square,
  Search,
  RefreshCw,
  ExternalLink,
  Edit3,
  X,
  Star,
  GitFork,
  SlidersHorizontal,
  ChevronRight,
  ArrowLeft,
  Plus,
  ShieldCheck,
  Check,
  Trash2,
  Code2,
  Layers,
  Sparkles,
  Github
} from 'lucide-react';

export const GITHUB_LANGUAGE_COLORS: Record<string, string> = {
  TypeScript: '#3178c6',
  JavaScript: '#f1e05a',
  Python: '#3572A5',
  'C++': '#f34b7d',
  C: '#555555',
  HTML: '#e34c26',
  CSS: '#563d7c',
  Rust: '#dea584',
  Go: '#00ADD8',
  Shell: '#89e051',
  Vue: '#41b883',
  Jupyter: '#DA5B0B',
};

export const LANGUAGE_COLORS = GITHUB_LANGUAGE_COLORS;

const CATEGORIES: ProjectCategory[] = [
  'Fullstack',
  'AI / ML',
  'Cybersecurity',
  'Systems',
  'Infrastructure',
];

const PRESET_IMAGES = [
  { label: 'Cybersecurity Matrix', url: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1000&q=80' },
  { label: 'AI Neural Net', url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80' },
  { label: 'Systems & Hardware', url: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=1200&q=80' },
  { label: 'Fullstack App', url: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1200&q=80' },
  { label: 'Cloud Infrastructure', url: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1200&q=80' },
];

interface GitHubRepoResponse {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  homepage: string | null;
  stargazers_count: number;
  forks_count: number;
  language: string | null;
  topics: string[];
  fork: boolean;
  archived: boolean;
  updated_at: string;
}

export const AdminPanel: React.FC = () => {
  const {
    projects,
    setProjects,
    addProject,
    deleteProject,
    toggleProjectSelection,
    selectAllProjects,
    setIsAdminOpen,
    setScreen,
  } = useApp();

  // Active Main Part: 'current' (Part 1: Current Projects) or 'add' (Part 2: Add New Projects)
  const [activePart, setActivePart] = useState<'current' | 'add'>('current');

  // For Part 2 (Add New Projects), two ways: 'github' or 'manual'
  const [addMode, setAddMode] = useState<'github' | 'manual'>('github');

  // GitHub Sync State
  const [githubUsername, setGithubUsername] = useState('Jeet1466');
  const [fetchedGithubRepos, setFetchedGithubRepos] = useState<GitHubRepoResponse[]>([]);
  const [isFetchingGithub, setIsFetchingGithub] = useState(false);
  const [githubSyncMessage, setGithubSyncMessage] = useState<string | null>(null);
  const [githubSyncError, setGithubSyncError] = useState<string | null>(null);
  const [githubRepoSearch, setGithubRepoSearch] = useState('');
  const [selectedGithubRepoIds, setSelectedGithubRepoIds] = useState<Set<number>>(new Set());

  // Part 1: Current Projects Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState<string>('All');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectionFilter, setSelectionFilter] = useState<'all' | 'selected' | 'unselected'>('all');

  // Edit Project Modal
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<Project>>({});

  // Delete Confirmation Modal
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);

  // Manual Project Creation Form State
  const [manualForm, setManualForm] = useState({
    title: '',
    subtitle: '',
    category: 'Fullstack' as ProjectCategory,
    language: 'TypeScript',
    description: '',
    detailedOverview: '',
    tagsString: 'TYPESCRIPT, REACT, FULLSTACK',
    githubUrl: '',
    liveUrl: '',
    throughput: '50k req/s',
    latency: '2.5ms p99',
    uptime: '99.99%',
    nodes: 'Cluster-01',
    imageUrl: PRESET_IMAGES[0].url,
    featured: false,
    selected: true,
  });
  const [manualFormSuccess, setManualFormSuccess] = useState<string | null>(null);

  // Close admin panel
  const handleClose = () => {
    setIsAdminOpen(false);
    setScreen('portfolio');
    if (window.location.hash === '#admin') {
      window.history.pushState(null, '', window.location.pathname);
    }
  };

  // Sync / fetch from GitHub API
  // CRITICAL RULE: Current projects are NEVER removed or overwritten!
  const handleFetchFromGithub = async () => {
    const username = githubUsername.trim();
    if (!username) return;

    setIsFetchingGithub(true);
    setGithubSyncError(null);
    setGithubSyncMessage(null);

    try {
      const response = await fetch(
        `https://api.github.com/users/${encodeURIComponent(username)}/repos?sort=updated&per_page=100`
      );

      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
      }

      const repos: GitHubRepoResponse[] = await response.json();
      setFetchedGithubRepos(repos);

      const { updatedProjects, updatedCount } = syncGithubWithCurrentProjects(projects, repos);
      setProjects(updatedProjects);
      setGithubSyncMessage(
        `Fetched ${repos.length} repos from @${username}. ${updatedCount} matching current projects updated with live metrics. All ${projects.length} current projects are strictly preserved.`
      );
      setTimeout(() => setGithubSyncMessage(null), 6000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to connect to GitHub';
      setGithubSyncError(`${msg}. (Rate limits apply to anonymous calls)`);
      setTimeout(() => setGithubSyncError(null), 7000);
    } finally {
      setIsFetchingGithub(false);
    }
  };

  // Check if a GitHub repo is already in Current Projects
  const isRepoInCurrentProjects = (repo: GitHubRepoResponse): boolean => {
    return projects.some((p) => {
      if (p.repoName && p.repoName.toLowerCase() === repo.full_name.toLowerCase()) return true;
      if (p.githubUrl && p.githubUrl.toLowerCase() === repo.html_url.toLowerCase()) return true;
      if (p.title.toLowerCase() === repo.name.toLowerCase()) return true;
      return false;
    });
  };

  // Add a single GitHub repo into Current Projects
  const handleAddRepoToCurrentProjects = (repo: GitHubRepoResponse) => {
    if (isRepoInCurrentProjects(repo)) return;

    const category = inferCategory(repo.name, repo.description || '', repo.language || '');
    const tags = repo.topics && repo.topics.length > 0
      ? repo.topics.map((t) => t.toUpperCase())
      : [repo.language?.toUpperCase() || 'CODE', 'GITHUB', 'OPEN-SOURCE'];

    const newProject: Project = {
      id: `gh-${repo.id}-${Date.now()}`,
      title: repo.name,
      subtitle: `${(repo.language || 'Software').toUpperCase()} ARCHITECTURE`,
      category,
      description: repo.description || `Public repository ${repo.name} by ${githubUsername}`,
      detailedOverview: repo.description
        ? `${repo.description} Engineered with ${repo.language || 'modern toolchains'} for high-efficiency runtime execution.`
        : `Repository ${repo.name} maintained on GitHub. Integrated into the Kinetic architecture showcase.`,
      tags,
      metrics: {
        throughput: `${repo.stargazers_count} Stars`,
        latency: `${repo.forks_count} Forks`,
        uptime: '99.9%',
        nodes: 'Distributed',
      },
      imageUrl: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=1200&q=80',
      imageAlt: repo.name,
      githubUrl: repo.html_url,
      liveUrl: repo.homepage || undefined,
      featured: repo.stargazers_count > 0,
      gridSpan: 'normal',
      updatedAt: repo.updated_at ? repo.updated_at.split('T')[0] : new Date().toISOString().split('T')[0],
      stars: repo.stargazers_count,
      forks: repo.forks_count,
      language: repo.language || undefined,
      topics: repo.topics || [],
      repoName: repo.full_name,
      selected: true,
      source: 'github',
    };

    setProjects((prev) => [newProject, ...prev]);
    setGithubSyncMessage(`Added "${repo.name}" to Current Projects!`);
    setTimeout(() => setGithubSyncMessage(null), 4000);
  };

  // Add multiple selected GitHub repos to Current Projects
  const handleBulkAddSelectedRepos = () => {
    const toAdd = fetchedGithubRepos.filter(
      (r) => selectedGithubRepoIds.has(r.id) && !isRepoInCurrentProjects(r)
    );

    if (toAdd.length === 0) return;

    const newProjects: Project[] = toAdd.map((repo) => {
      const category = inferCategory(repo.name, repo.description || '', repo.language || '');
      const tags = repo.topics && repo.topics.length > 0
        ? repo.topics.map((t) => t.toUpperCase())
        : [repo.language?.toUpperCase() || 'CODE', 'GITHUB', 'OPEN-SOURCE'];

      return {
        id: `gh-${repo.id}-${Date.now()}`,
        title: repo.name,
        subtitle: `${(repo.language || 'Software').toUpperCase()} ARCHITECTURE`,
        category,
        description: repo.description || `Public repository ${repo.name} by ${githubUsername}`,
        detailedOverview: repo.description
          ? `${repo.description} Engineered with ${repo.language || 'modern toolchains'}.`
          : `Repository ${repo.name} maintained on GitHub.`,
        tags,
        metrics: {
          throughput: `${repo.stargazers_count} Stars`,
          latency: `${repo.forks_count} Forks`,
          uptime: '99.9%',
          nodes: 'Distributed',
        },
        imageUrl: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=1200&q=80',
        imageAlt: repo.name,
        githubUrl: repo.html_url,
        liveUrl: repo.homepage || undefined,
        featured: repo.stargazers_count > 0,
        gridSpan: 'normal',
        updatedAt: repo.updated_at ? repo.updated_at.split('T')[0] : new Date().toISOString().split('T')[0],
        stars: repo.stargazers_count,
        forks: repo.forks_count,
        language: repo.language || undefined,
        topics: repo.topics || [],
        repoName: repo.full_name,
        selected: true,
        source: 'github',
      };
    });

    setProjects((prev) => [...newProjects, ...prev]);
    setSelectedGithubRepoIds(new Set());
    setGithubSyncMessage(`Added ${newProjects.length} repositories to Current Projects!`);
    setTimeout(() => setGithubSyncMessage(null), 4000);
  };

  // Handle Manual Project Submission
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualForm.title.trim()) return;

    const tagsArray = manualForm.tagsString
      .split(',')
      .map((t) => t.trim().toUpperCase())
      .filter(Boolean);

    addProject({
      title: manualForm.title.trim(),
      subtitle: manualForm.subtitle.trim() || `${manualForm.category.toUpperCase()} _ ARCHITECTURE`,
      category: manualForm.category,
      description: manualForm.description.trim() || 'Custom engineered high-performance system.',
      detailedOverview: manualForm.detailedOverview.trim() || manualForm.description.trim(),
      tags: tagsArray.length > 0 ? tagsArray : ['ENGINEERING', 'SYSTEMS'],
      language: manualForm.language.trim() || undefined,
      metrics: {
        throughput: manualForm.throughput.trim(),
        latency: manualForm.latency.trim(),
        uptime: manualForm.uptime.trim(),
        nodes: manualForm.nodes.trim(),
      },
      imageUrl: manualForm.imageUrl.trim() || PRESET_IMAGES[0].url,
      githubUrl: manualForm.githubUrl.trim() || undefined,
      liveUrl: manualForm.liveUrl.trim() || undefined,
      featured: manualForm.featured,
      selected: manualForm.selected,
      gridSpan: 'normal',
      source: 'manual',
    });

    setManualFormSuccess(`Project "${manualForm.title}" successfully added to Current Projects!`);
    setTimeout(() => setManualFormSuccess(null), 5000);

    // Reset Form
    setManualForm({
      title: '',
      subtitle: '',
      category: 'Fullstack',
      language: 'TypeScript',
      description: '',
      detailedOverview: '',
      tagsString: 'TYPESCRIPT, REACT, FULLSTACK',
      githubUrl: '',
      liveUrl: '',
      throughput: '50k req/s',
      latency: '2.5ms p99',
      uptime: '99.99%',
      nodes: 'Cluster-01',
      imageUrl: PRESET_IMAGES[0].url,
      featured: false,
      selected: true,
    });

    // Switch to Current Projects view to see the new project
    setActivePart('current');
  };

  // Open Edit Modal
  const openEditModal = (p: Project) => {
    setEditingProject(p);
    setEditFormData({
      ...p,
      metrics: {
        throughput: p.metrics?.throughput || '50k req/s',
        latency: p.metrics?.latency || '2.5ms p99',
        uptime: p.metrics?.uptime || '99.99%',
        nodes: p.metrics?.nodes || 'Cluster-01',
      },
      imageUrl: p.imageUrl || PRESET_IMAGES[0].url,
    });
  };

  const saveEdit = () => {
    if (!editingProject) return;
    setProjects(
      projects.map((p) => (p.id === editingProject.id ? ({ ...p, ...editFormData } as Project) : p))
    );
    setEditingProject(null);
  };

  // Confirm and Execute Delete Project
  const confirmDeleteProject = () => {
    if (!projectToDelete) return;
    deleteProject(projectToDelete.id);
    setProjectToDelete(null);
  };

  // Available languages from current projects
  const availableLanguages = [
    'All',
    ...Array.from(new Set(projects.map((p) => p.language).filter(Boolean) as string[])),
  ];

  // Filtered Current Projects list
  const filteredCurrentProjects = projects.filter((p) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      p.title.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q) ||
      p.tags.some((t) => t.toLowerCase().includes(q)) ||
      (p.language && p.language.toLowerCase().includes(q));

    const matchesLang = selectedLanguage === 'All' || p.language === selectedLanguage;
    const matchesCat = selectedCategory === 'All' || p.category === selectedCategory;
    const matchesSel =
      selectionFilter === 'all' ||
      (selectionFilter === 'selected' && p.selected !== false) ||
      (selectionFilter === 'unselected' && p.selected === false);

    return matchesSearch && matchesLang && matchesCat && matchesSel;
  });

  // Filtered GitHub Repositories in Part 2
  const filteredGithubRepos = fetchedGithubRepos.filter((repo) => {
    const q = githubRepoSearch.toLowerCase().trim();
    if (!q) return true;
    return (
      repo.name.toLowerCase().includes(q) ||
      (repo.description && repo.description.toLowerCase().includes(q)) ||
      (repo.language && repo.language.toLowerCase().includes(q)) ||
      (repo.topics && repo.topics.some((t) => t.toLowerCase().includes(q)))
    );
  });

  const selectedCount = projects.filter((p) => p.selected !== false).length;

  return (
    <div className="fixed inset-0 z-50 bg-[#121414] text-[#e2e2e2] flex flex-col overflow-hidden font-sans">
      {/* ======================================================== */}
      {/* 1. TOP HEADER & MAIN NAVIGATION TABS */}
      {/* ======================================================== */}
      <header className="h-16 border-b border-white/10 bg-[#0d0f0f] px-4 sm:px-6 flex items-center justify-between shrink-0 z-20">
        <div className="flex items-center gap-3 sm:gap-4">
          <button
            onClick={handleClose}
            className="flex items-center gap-2 px-3 py-1.5 border border-white/15 text-white/80 hover:text-white hover:border-[#dfff00]/50 font-technical text-xs uppercase tracking-wider transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Return to Portfolio</span>
            <span className="sm:hidden">Back</span>
          </button>

          <div className="h-5 w-px bg-white/10 hidden md:block" />

          {/* TWO MAIN PARTS NAVIGATION TABS */}
          <div className="flex items-center gap-1 sm:gap-2 bg-[#161818] p-1 border border-white/10 rounded-xs">
            <button
              onClick={() => setActivePart('current')}
              className={`px-3 py-1.5 font-technical text-xs uppercase tracking-wider font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activePart === 'current'
                  ? 'bg-[#dfff00] text-[#121414]'
                  : 'text-[#c6c9ab] hover:text-white hover:bg-white/5'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Current Projects</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-xs ${
                  activePart === 'current' ? 'bg-[#121414]/20 text-[#121414]' : 'bg-white/10 text-white'
                }`}
              >
                {projects.length}
              </span>
            </button>

            <button
              onClick={() => setActivePart('add')}
              className={`px-3 py-1.5 font-technical text-xs uppercase tracking-wider font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activePart === 'add'
                  ? 'bg-[#dfff00] text-[#121414]'
                  : 'text-[#c6c9ab] hover:text-white hover:bg-white/5'
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add New Projects</span>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden lg:flex items-center gap-2 text-xs font-technical text-neutral-400">
            <span>ACTIVE ON PORTFOLIO:</span>
            <span className="text-[#dfff00] font-bold">
              {selectedCount} / {projects.length}
            </span>
          </div>

          <button
            onClick={handleClose}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#dfff00] text-[#121414] font-technical font-bold text-xs uppercase tracking-wider hover:bg-[#ccee00] transition-colors cursor-pointer"
          >
            <span>Done</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* ======================================================== */}
      {/* 2. BODY CONTENT: PART 1 OR PART 2 */}
      {/* ======================================================== */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {/* ======================================================== */}
        {/* PART 1: CURRENT PROJECTS (PROTECTED REGISTRY) */}
        {/* ======================================================== */}
        {activePart === 'current' && (
          <div className="flex-1 flex flex-col overflow-hidden bg-[#121414]">
            {/* Top Protection & Filter Bar */}
            <div className="border-b border-white/10 bg-[#161818] p-4 flex flex-col gap-3 shrink-0">
              {/* Protection notice banner */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 bg-[#1a1d1d] border border-[#dfff00]/30 rounded-xs">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#dfff00] shrink-0" />
                  <span className="font-technical text-xs text-white">
                    <strong className="text-[#dfff00]">PROTECTED ARCHITECTURE REGISTRY:</strong>{' '}
                    These {projects.length} projects are permanently preserved in your portfolio and are{' '}
                    <strong className="text-[#dfff00]">NEVER removed or overwritten</strong> when syncing GitHub.
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => selectAllProjects(true)}
                    className="px-2.5 py-1 bg-[#202424] hover:bg-[#282d2d] text-white border border-white/10 font-technical text-[10px] uppercase flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <CheckSquare className="w-3 h-3 text-[#dfff00]" />
                    <span>Select All</span>
                  </button>
                  <button
                    onClick={() => selectAllProjects(false)}
                    className="px-2.5 py-1 bg-[#202424] hover:bg-[#282d2d] text-neutral-400 hover:text-white border border-white/10 font-technical text-[10px] uppercase flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Square className="w-3 h-3" />
                    <span>Hide All</span>
                  </button>
                </div>
              </div>

              {/* Search & Filter Controls */}
              <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
                {/* Search Box */}
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search current projects by title, tags, description..."
                    className="w-full bg-[#1b1e1e] border border-white/15 pl-9 pr-3 py-1.5 text-xs font-technical text-white focus:outline-none focus:border-[#dfff00]/60 placeholder:text-neutral-500"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Filter Pills */}
                <div className="flex flex-wrap items-center gap-2">
                  {/* Category selector */}
                  <select
                    aria-label="Filter current projects by domain category"
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="bg-[#1b1e1e] border border-white/15 px-3 py-1.5 text-xs font-technical text-neutral-300 focus:outline-none focus:border-[#dfff00]/60"
                  >
                    <option value="All">All Categories</option>
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>

                  {/* Language selector */}
                  <select
                    aria-label="Filter current projects by programming language"
                    value={selectedLanguage}
                    onChange={(e) => setSelectedLanguage(e.target.value)}
                    className="bg-[#1b1e1e] border border-white/15 px-3 py-1.5 text-xs font-technical text-neutral-300 focus:outline-none focus:border-[#dfff00]/60"
                  >
                    {availableLanguages.map((l) => (
                      <option key={l} value={l}>
                        {l === 'All' ? 'All Languages' : l}
                      </option>
                    ))}
                  </select>

                  {/* Selection status */}
                  <div className="flex border border-white/15 bg-[#1b1e1e]">
                    <button
                      onClick={() => setSelectionFilter('all')}
                      className={`px-2.5 py-1 text-xs font-technical uppercase transition-colors cursor-pointer ${
                        selectionFilter === 'all'
                          ? 'bg-[#dfff00] text-[#121414] font-bold'
                          : 'text-neutral-400 hover:text-white'
                      }`}
                    >
                      All ({projects.length})
                    </button>
                    <button
                      onClick={() => setSelectionFilter('selected')}
                      className={`px-2.5 py-1 text-xs font-technical uppercase transition-colors cursor-pointer ${
                        selectionFilter === 'selected'
                          ? 'bg-[#dfff00] text-[#121414] font-bold'
                          : 'text-neutral-400 hover:text-white'
                      }`}
                    >
                      Active ({selectedCount})
                    </button>
                    <button
                      onClick={() => setSelectionFilter('unselected')}
                      className={`px-2.5 py-1 text-xs font-technical uppercase transition-colors cursor-pointer ${
                        selectionFilter === 'unselected'
                          ? 'bg-[#dfff00] text-[#121414] font-bold'
                          : 'text-neutral-400 hover:text-white'
                      }`}
                    >
                      Hidden ({projects.length - selectedCount})
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Current Projects Grid */}
            <div className="flex-1 p-6 overflow-y-auto">
              {filteredCurrentProjects.length === 0 ? (
                <div className="h-64 flex flex-col items-center justify-center text-center p-6 border border-dashed border-white/15 bg-[#161818]/60">
                  <SlidersHorizontal className="w-8 h-8 text-neutral-500 mb-3" />
                  <h3 className="text-white font-display font-bold text-base mb-1">
                    No Current Projects Found
                  </h3>
                  <p className="text-neutral-400 font-technical text-xs max-w-sm mb-4">
                    No projects match your current filters or search query.
                  </p>
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedLanguage('All');
                      setSelectedCategory('All');
                      setSelectionFilter('all');
                    }}
                    className="px-3 py-1.5 border border-white/20 text-white font-technical text-xs hover:border-[#dfff00]/50 cursor-pointer"
                  >
                    Reset Filters
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {filteredCurrentProjects.map((project) => {
                    const isSelected = project.selected !== false;
                    const langColor =
                      (project.language && LANGUAGE_COLORS[project.language]) || '#8a8d90';
                    const isManual = project.source === 'manual';

                    return (
                      <div
                        key={project.id}
                        className={`relative flex flex-col bg-[#171919] border transition-all duration-150 ${
                          isSelected
                            ? 'border-[#dfff00]/40 shadow-sm'
                            : 'border-white/10 opacity-70 hover:opacity-100'
                        }`}
                      >
                        {/* Top Action Ribbon */}
                        <div className="p-3 border-b border-white/10 flex items-center justify-between bg-[#141616]">
                          {/* Visibility Checkbox Toggle */}
                          <button
                            onClick={() => toggleProjectSelection(project.id)}
                            className="flex items-center gap-2 group/btn cursor-pointer"
                          >
                            {isSelected ? (
                              <CheckSquare className="w-4 h-4 text-[#dfff00]" />
                            ) : (
                              <Square className="w-4 h-4 text-neutral-500 group-hover/btn:text-neutral-300" />
                            )}
                            <span
                              className={`text-xs font-technical font-bold uppercase tracking-wider ${
                                isSelected ? 'text-[#dfff00]' : 'text-neutral-400'
                              }`}
                            >
                              {isSelected ? 'Active on Portfolio' : 'Hidden'}
                            </span>
                          </button>

                          {/* Source & Actions */}
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`text-[9px] font-technical uppercase px-1.5 py-0.5 border rounded-xs font-bold ${
                                isManual
                                  ? 'text-amber-300 border-amber-500/40 bg-amber-500/10'
                                  : 'text-cyan-300 border-cyan-500/40 bg-cyan-500/10'
                              }`}
                            >
                              {isManual ? 'MANUAL' : 'GITHUB'}
                            </span>

                            {/* Edit Button */}
                            <button
                              onClick={() => openEditModal(project)}
                              className="flex items-center gap-1 px-2 py-1 border border-white/10 hover:border-white/30 text-neutral-300 hover:text-white font-technical text-[10px] transition-colors cursor-pointer"
                              title="Edit Card Details"
                            >
                              <Edit3 className="w-3 h-3 text-[#dfff00]" />
                              <span>Edit</span>
                            </button>

                            {/* Delete Button */}
                            <button
                              onClick={() => setProjectToDelete(project)}
                              className="p-1 border border-white/10 hover:border-rose-500/50 text-neutral-400 hover:text-rose-400 font-technical text-[10px] transition-colors cursor-pointer"
                              title="Remove from Current Projects"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>

                        {/* Card Body */}
                        <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                          <div className="space-y-2">
                            <div className="flex items-start justify-between gap-2">
                              <h4 className="text-white font-display font-bold text-base tracking-tight hover:text-[#dfff00] transition-colors line-clamp-1">
                                {project.title}
                              </h4>
                              <span className="text-[10px] font-technical text-white/60 bg-white/5 border border-white/10 px-2 py-0.5 shrink-0">
                                {project.category}
                              </span>
                            </div>

                            <p className="text-neutral-300 text-xs line-clamp-2 leading-relaxed">
                              {project.description}
                            </p>
                          </div>

                          {/* Tech Tags */}
                          {project.tags && project.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 pt-1">
                              {project.tags.slice(0, 4).map((tag) => (
                                <span
                                  key={tag}
                                  className="text-[9px] font-technical text-neutral-300 bg-white/[0.04] px-1.5 py-0.5 border border-white/5"
                                >
                                  #{tag}
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Footer stats & links */}
                          <div className="pt-3 border-t border-white/10 flex items-center justify-between text-xs font-technical text-neutral-400">
                            {/* Language indicator */}
                            <div className="flex items-center gap-1.5">
                              {project.language ? (
                                <>
                                  <span
                                    className="w-2.5 h-2.5 rounded-full inline-block"
                                    style={{ backgroundColor: langColor }}
                                  />
                                  <span className="text-white/80">{project.language}</span>
                                </>
                              ) : (
                                <span className="text-neutral-500">Universal</span>
                              )}
                            </div>

                            {/* GitHub Metrics & External Link */}
                            <div className="flex items-center gap-3">
                              {typeof project.stars === 'number' && (
                                <span
                                  className="flex items-center gap-1 text-neutral-400"
                                  title="GitHub Stars"
                                >
                                  <Star className="w-3 h-3 text-[#dfff00]" />
                                  <span>{project.stars}</span>
                                </span>
                              )}
                              {typeof project.forks === 'number' && (
                                <span
                                  className="flex items-center gap-1 text-neutral-400"
                                  title="Forks"
                                >
                                  <GitFork className="w-3 h-3" />
                                  <span>{project.forks}</span>
                                </span>
                              )}
                              {project.githubUrl && (
                                <a
                                  href={project.githubUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-neutral-400 hover:text-[#dfff00] transition-colors"
                                  title="Open Repository"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </a>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* PART 2: ADD NEW PROJECTS (DUAL MODE: GITHUB & MANUAL) */}
        {/* ======================================================== */}
        {activePart === 'add' && (
          <div className="flex-1 flex flex-col overflow-hidden bg-[#121414]">
            {/* Sub-selector for Mode: Select from GitHub OR Manual Creation */}
            <div className="border-b border-white/10 bg-[#161818] px-6 py-3 flex flex-wrap items-center justify-between gap-4 shrink-0">
              <div className="flex items-center gap-3">
                <span className="font-technical text-xs text-[#dfff00] font-bold uppercase tracking-wider">
                  [ADDITION_PIPELINE]:
                </span>
                <div className="flex bg-[#1b1e1e] p-1 border border-white/10 rounded-xs">
                  <button
                    onClick={() => setAddMode('github')}
                    className={`px-3.5 py-1.5 font-technical text-xs uppercase tracking-wider font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                      addMode === 'github'
                        ? 'bg-[#dfff00] text-[#121414]'
                        : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    <FolderGit2 className="w-3.5 h-3.5" />
                    <span>Select from GitHub</span>
                  </button>
                  <button
                    onClick={() => setAddMode('manual')}
                    className={`px-3.5 py-1.5 font-technical text-xs uppercase tracking-wider font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                      addMode === 'manual'
                        ? 'bg-[#dfff00] text-[#121414]'
                        : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Manual Creation</span>
                  </button>
                </div>
              </div>

              <div className="text-xs font-technical text-neutral-400">
                {addMode === 'github'
                  ? 'Select repositories from your GitHub account to add into Current Projects.'
                  : 'Design and manually publish a custom architectural project specification.'}
              </div>
            </div>

            {/* Notification messages */}
            {githubSyncMessage && (
              <div className="mx-6 mt-4 p-3 bg-[#dfff00]/10 border border-[#dfff00]/30 font-technical text-xs text-[#dfff00] flex items-center gap-2">
                <Check className="w-4 h-4 text-[#dfff00]" />
                <span>{githubSyncMessage}</span>
              </div>
            )}
            {githubSyncError && (
              <div className="mx-6 mt-4 p-3 bg-rose-950/40 border border-rose-800/40 font-technical text-xs text-rose-400 flex items-center gap-2">
                <X className="w-4 h-4 text-rose-400" />
                <span>{githubSyncError}</span>
              </div>
            )}
            {manualFormSuccess && (
              <div className="mx-6 mt-4 p-3 bg-[#dfff00]/10 border border-[#dfff00]/30 font-technical text-xs text-[#dfff00] flex items-center gap-2">
                <Check className="w-4 h-4 text-[#dfff00]" />
                <span>{manualFormSuccess}</span>
              </div>
            )}

            {/* --- WAY A: SELECT FROM GITHUB --- */}
            {addMode === 'github' && (
              <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
                {/* Left Sync Controller */}
                <div className="w-full lg:w-80 border-b lg:border-b-0 lg:border-r border-white/10 bg-[#141616] p-5 flex flex-col gap-5 shrink-0 overflow-y-auto">
                  <div className="space-y-3">
                    <label
                      htmlFor="github-fetch-username"
                      className="text-xs font-technical font-bold uppercase tracking-wider text-white/70 flex items-center gap-2"
                    >
                      <Github className="w-3.5 h-3.5 text-[#dfff00]" />
                      <span>GitHub Account Source</span>
                    </label>

                    <div className="flex gap-2">
                      <input
                        id="github-fetch-username"
                        type="text"
                        value={githubUsername}
                        onChange={(e) => setGithubUsername(e.target.value)}
                        placeholder="GitHub Username"
                        className="flex-1 bg-[#1a1d1d] border border-white/15 px-3 py-2 text-xs font-technical text-white focus:outline-none focus:border-[#dfff00]/60 placeholder:text-neutral-500"
                      />
                      <button
                        onClick={handleFetchFromGithub}
                        disabled={isFetchingGithub}
                        className="px-3 py-2 bg-[#dfff00] text-[#121414] font-technical font-bold text-xs hover:bg-[#ccee00] transition-colors disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isFetchingGithub ? 'animate-spin' : ''}`} />
                        <span>Fetch</span>
                      </button>
                    </div>

                    <div className="text-[11px] font-technical text-neutral-400 leading-relaxed bg-[#1b1e1e] p-3 border border-white/5 rounded-xs">
                      <p className="text-white/80 font-bold mb-1">Protection Guarantee:</p>
                      Fetching repositories lists your public repos below. Any repo already in Current Projects is preserved intact and updated with live stars/forks.
                    </div>
                  </div>

                  {/* Bulk Add Selected Repos */}
                  {selectedGithubRepoIds.size > 0 && (
                    <div className="p-3 bg-[#1a1d1d] border border-[#dfff00]/40 rounded-xs space-y-2">
                      <div className="flex justify-between items-center text-xs font-technical">
                        <span className="text-[#dfff00] font-bold">
                          {selectedGithubRepoIds.size} Selected
                        </span>
                        <button
                          onClick={() => setSelectedGithubRepoIds(new Set())}
                          className="text-neutral-400 hover:text-white underline cursor-pointer"
                        >
                          Clear
                        </button>
                      </div>
                      <button
                        onClick={handleBulkAddSelectedRepos}
                        className="w-full py-2 bg-[#dfff00] text-[#121414] font-technical font-bold text-xs uppercase tracking-wider hover:bg-[#ccee00] transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Selected to Portfolio</span>
                      </button>
                    </div>
                  )}

                  <div className="mt-auto pt-4 border-t border-white/10 text-xs font-technical text-neutral-400 space-y-1.5">
                    <div className="flex justify-between">
                      <span>Repos Discovered:</span>
                      <span className="text-white font-bold">{fetchedGithubRepos.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Current Portfolio Projects:</span>
                      <span className="text-[#dfff00] font-bold">{projects.length}</span>
                    </div>
                  </div>
                </div>

                {/* Right Repos List to Select From */}
                <div className="flex-1 flex flex-col bg-[#121414] overflow-hidden">
                  {/* Search inside fetched repos */}
                  <div className="p-4 border-b border-white/10 bg-[#161818] flex items-center justify-between gap-3 shrink-0">
                    <div className="relative flex-1 max-w-md">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                      <input
                        type="text"
                        value={githubRepoSearch}
                        onChange={(e) => setGithubRepoSearch(e.target.value)}
                        placeholder="Search fetched repositories..."
                        className="w-full bg-[#1b1e1e] border border-white/15 pl-9 pr-3 py-1.5 text-xs font-technical text-white focus:outline-none focus:border-[#dfff00]/60 placeholder:text-neutral-500"
                      />
                    </div>

                    <div className="text-xs font-technical text-neutral-400">
                      Showing {filteredGithubRepos.length} repositories
                    </div>
                  </div>

                  <div className="flex-1 p-6 overflow-y-auto">
                    {fetchedGithubRepos.length === 0 ? (
                      <div className="h-64 flex flex-col items-center justify-center text-center p-6 border border-dashed border-white/15 bg-[#161818]/60">
                        <FolderGit2 className="w-10 h-10 text-[#dfff00]/70 mb-3" />
                        <h3 className="text-white font-display font-bold text-base mb-1">
                          No Repositories Fetched Yet
                        </h3>
                        <p className="text-neutral-400 font-technical text-xs max-w-sm mb-4">
                          Click &quot;Fetch&quot; on the left to discover repositories from GitHub (@{githubUsername}).
                        </p>
                        <button
                          onClick={handleFetchFromGithub}
                          disabled={isFetchingGithub}
                          className="px-4 py-2 bg-[#dfff00] text-[#121414] font-technical font-bold text-xs uppercase tracking-wider hover:bg-[#ccee00] transition-colors cursor-pointer"
                        >
                          Fetch Repos Now
                        </button>
                      </div>
                    ) : filteredGithubRepos.length === 0 ? (
                      <div className="h-48 flex items-center justify-center text-center p-6 border border-dashed border-white/15 text-neutral-400 font-technical text-xs">
                        No repositories match &quot;{githubRepoSearch}&quot;.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        {filteredGithubRepos.map((repo) => {
                          const alreadyIn = isRepoInCurrentProjects(repo);
                          const isSelectedForBulk = selectedGithubRepoIds.has(repo.id);
                          const langColor =
                            (repo.language && LANGUAGE_COLORS[repo.language]) || '#8a8d90';

                          return (
                            <div
                              key={repo.id}
                              className={`relative flex flex-col bg-[#171919] border transition-all ${
                                alreadyIn
                                  ? 'border-emerald-500/40 bg-emerald-950/10'
                                  : isSelectedForBulk
                                  ? 'border-[#dfff00] bg-[#1a1d1d]'
                                  : 'border-white/10 hover:border-white/30'
                              }`}
                            >
                              {/* Header */}
                              <div className="p-3 border-b border-white/10 flex items-center justify-between bg-[#141616]">
                                <div className="flex items-center gap-2">
                                  {!alreadyIn && (
                                    <button
                                      onClick={() => {
                                        setSelectedGithubRepoIds((prev) => {
                                          const next = new Set(prev);
                                          if (next.has(repo.id)) next.delete(repo.id);
                                          else next.add(repo.id);
                                          return next;
                                        });
                                      }}
                                      className="cursor-pointer text-neutral-400 hover:text-white"
                                    >
                                      {isSelectedForBulk ? (
                                        <CheckSquare className="w-4 h-4 text-[#dfff00]" />
                                      ) : (
                                        <Square className="w-4 h-4" />
                                      )}
                                    </button>
                                  )}
                                  <span className="font-technical text-xs font-bold text-white truncate max-w-[180px]">
                                    {repo.name}
                                  </span>
                                </div>

                                <div>
                                  {alreadyIn ? (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-technical font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-xs">
                                      <Check className="w-3 h-3" />
                                      <span>In Current Projects</span>
                                    </span>
                                  ) : (
                                    <button
                                      onClick={() => handleAddRepoToCurrentProjects(repo)}
                                      className="inline-flex items-center gap-1 text-[10px] font-technical font-bold text-[#121414] bg-[#dfff00] hover:bg-[#ccee00] px-2.5 py-1 rounded-xs uppercase tracking-wider cursor-pointer transition-colors"
                                    >
                                      <Plus className="w-3 h-3" />
                                      <span>Add</span>
                                    </button>
                                  )}
                                </div>
                              </div>

                              {/* Body */}
                              <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                                <div>
                                  <p className="text-neutral-300 text-xs line-clamp-3 leading-relaxed mb-2">
                                    {repo.description || 'No description provided.'}
                                  </p>

                                  {repo.topics && repo.topics.length > 0 && (
                                    <div className="flex flex-wrap gap-1">
                                      {repo.topics.slice(0, 3).map((t) => (
                                        <span
                                          key={t}
                                          className="text-[9px] font-technical text-neutral-400 bg-white/5 px-1.5 py-0.5 border border-white/5"
                                        >
                                          #{t}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </div>

                                <div className="pt-3 border-t border-white/10 flex items-center justify-between text-xs font-technical text-neutral-400">
                                  <div className="flex items-center gap-1.5">
                                    {repo.language && (
                                      <>
                                        <span
                                          className="w-2 h-2 rounded-full inline-block"
                                          style={{ backgroundColor: langColor }}
                                        />
                                        <span className="text-white/80">{repo.language}</span>
                                      </>
                                    )}
                                  </div>

                                  <div className="flex items-center gap-3">
                                    <span className="flex items-center gap-1 text-neutral-300">
                                      <Star className="w-3 h-3 text-[#dfff00]" />
                                      <span>{repo.stargazers_count}</span>
                                    </span>
                                    <span className="flex items-center gap-1 text-neutral-400">
                                      <GitFork className="w-3 h-3" />
                                      <span>{repo.forks_count}</span>
                                    </span>
                                    <a
                                      href={repo.html_url}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="text-neutral-400 hover:text-[#dfff00]"
                                      title="Open GitHub"
                                    >
                                      <ExternalLink className="w-3.5 h-3.5" />
                                    </a>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* --- WAY B: MANUAL PROJECT CREATION --- */}
            {addMode === 'manual' && (
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 max-w-4xl mx-auto w-full">
                <form
                  onSubmit={handleManualSubmit}
                  className="bg-[#171919] border border-white/15 p-6 space-y-6 rounded-xs"
                >
                  <div className="border-b border-white/10 pb-4">
                    <h3 className="font-display text-xl text-white font-bold flex items-center gap-2">
                      <Code2 className="w-5 h-5 text-[#dfff00]" />
                      <span>Manual Project Architecture Builder</span>
                    </h3>
                    <p className="font-technical text-xs text-neutral-400 mt-1">
                      Manually construct and register a new architectural project. It will be added to Current Projects and protected from sync deletion.
                    </p>
                  </div>

                  {/* Grid fields */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-technical text-xs">
                    <div>
                      <label className="block text-white/80 mb-1 uppercase tracking-wider font-bold">
                        Project Title *
                      </label>
                      <input
                        type="text"
                        required
                        value={manualForm.title}
                        onChange={(e) => setManualForm({ ...manualForm, title: e.target.value })}
                        placeholder="e.g. Subdomain Recon Engine"
                        className="w-full bg-[#1b1e1e] border border-white/15 px-3 py-2 text-white focus:outline-none focus:border-[#dfff00]"
                      />
                    </div>

                    <div>
                      <label className="block text-white/80 mb-1 uppercase tracking-wider font-bold">
                        Subtitle / Role
                      </label>
                      <input
                        type="text"
                        value={manualForm.subtitle}
                        onChange={(e) => setManualForm({ ...manualForm, subtitle: e.target.value })}
                        placeholder="e.g. CYBERSECURITY _ RECON PROTOCOL"
                        className="w-full bg-[#1b1e1e] border border-white/15 px-3 py-2 text-white focus:outline-none focus:border-[#dfff00]"
                      />
                    </div>

                    <div>
                      <label className="block text-white/80 mb-1 uppercase tracking-wider font-bold">
                        Category Domain *
                      </label>
                      <select
                        value={manualForm.category}
                        onChange={(e) =>
                          setManualForm({ ...manualForm, category: e.target.value as ProjectCategory })
                        }
                        className="w-full bg-[#1b1e1e] border border-white/15 px-3 py-2 text-white focus:outline-none focus:border-[#dfff00]"
                      >
                        {CATEGORIES.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-white/80 mb-1 uppercase tracking-wider font-bold">
                        Primary Programming Language
                      </label>
                      <input
                        type="text"
                        value={manualForm.language}
                        onChange={(e) => setManualForm({ ...manualForm, language: e.target.value })}
                        placeholder="e.g. Python, TypeScript, Rust, C++"
                        className="w-full bg-[#1b1e1e] border border-white/15 px-3 py-2 text-white focus:outline-none focus:border-[#dfff00]"
                      />
                    </div>
                  </div>

                  {/* Descriptions */}
                  <div className="space-y-4 font-technical text-xs">
                    <div>
                      <label className="block text-white/80 mb-1 uppercase tracking-wider font-bold">
                        Overview Description * (Short summary for card)
                      </label>
                      <textarea
                        rows={2}
                        required
                        value={manualForm.description}
                        onChange={(e) => setManualForm({ ...manualForm, description: e.target.value })}
                        placeholder="High-performance asynchronous reconnaissance engine engineered for sub-second DNS bruteforcing..."
                        className="w-full bg-[#1b1e1e] border border-white/15 px-3 py-2 text-white focus:outline-none focus:border-[#dfff00]"
                      />
                    </div>

                    <div>
                      <label className="block text-white/80 mb-1 uppercase tracking-wider font-bold">
                        Architectural Specifications (In-depth architecture details)
                      </label>
                      <textarea
                        rows={3}
                        value={manualForm.detailedOverview}
                        onChange={(e) =>
                          setManualForm({ ...manualForm, detailedOverview: e.target.value })
                        }
                        placeholder="Employs ring buffers and zero-copy deserialization to handle 100k packets per second without packet drop..."
                        className="w-full bg-[#1b1e1e] border border-white/15 px-3 py-2 text-white focus:outline-none focus:border-[#dfff00]"
                      />
                    </div>

                    <div>
                      <label className="block text-white/80 mb-1 uppercase tracking-wider font-bold">
                        Technical Primitives / Tags (comma separated)
                      </label>
                      <input
                        type="text"
                        value={manualForm.tagsString}
                        onChange={(e) => setManualForm({ ...manualForm, tagsString: e.target.value })}
                        placeholder="PYTHON, FASTAPI, DOCKER, OSINT"
                        className="w-full bg-[#1b1e1e] border border-white/15 px-3 py-2 text-white focus:outline-none focus:border-[#dfff00]"
                      />
                    </div>
                  </div>

                  {/* URLs & Telemetry */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-technical text-xs">
                    <div>
                      <label className="block text-white/80 mb-1 uppercase tracking-wider font-bold">
                        GitHub URL (Optional)
                      </label>
                      <input
                        type="url"
                        value={manualForm.githubUrl}
                        onChange={(e) => setManualForm({ ...manualForm, githubUrl: e.target.value })}
                        placeholder="https://github.com/Jeet1466/..."
                        className="w-full bg-[#1b1e1e] border border-white/15 px-3 py-2 text-white focus:outline-none focus:border-[#dfff00]"
                      />
                    </div>

                    <div>
                      <label className="block text-white/80 mb-1 uppercase tracking-wider font-bold">
                        Live Demo URL (Optional)
                      </label>
                      <input
                        type="url"
                        value={manualForm.liveUrl}
                        onChange={(e) => setManualForm({ ...manualForm, liveUrl: e.target.value })}
                        placeholder="https://..."
                        className="w-full bg-[#1b1e1e] border border-white/15 px-3 py-2 text-white focus:outline-none focus:border-[#dfff00]"
                      />
                    </div>
                  </div>

                  {/* Telemetry 4-Metric Grid */}
                  <div className="pt-2 border-t border-white/10 space-y-2 font-technical text-xs">
                    <span className="block text-white/80 uppercase tracking-wider font-bold">
                      Telemetry Performance Metrics
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <div>
                        <label className="block text-neutral-400 text-[10px] uppercase">Throughput</label>
                        <input
                          type="text"
                          value={manualForm.throughput}
                          onChange={(e) => setManualForm({ ...manualForm, throughput: e.target.value })}
                          className="w-full bg-[#1b1e1e] border border-white/15 px-2.5 py-1.5 text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-neutral-400 text-[10px] uppercase">Latency</label>
                        <input
                          type="text"
                          value={manualForm.latency}
                          onChange={(e) => setManualForm({ ...manualForm, latency: e.target.value })}
                          className="w-full bg-[#1b1e1e] border border-white/15 px-2.5 py-1.5 text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-neutral-400 text-[10px] uppercase">Uptime</label>
                        <input
                          type="text"
                          value={manualForm.uptime}
                          onChange={(e) => setManualForm({ ...manualForm, uptime: e.target.value })}
                          className="w-full bg-[#1b1e1e] border border-white/15 px-2.5 py-1.5 text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-neutral-400 text-[10px] uppercase">Nodes / Cluster</label>
                        <input
                          type="text"
                          value={manualForm.nodes}
                          onChange={(e) => setManualForm({ ...manualForm, nodes: e.target.value })}
                          className="w-full bg-[#1b1e1e] border border-white/15 px-2.5 py-1.5 text-white"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Image Selector & Presets */}
                  <div className="pt-2 border-t border-white/10 space-y-2 font-technical text-xs">
                    <label className="block text-white/80 uppercase tracking-wider font-bold">
                      Card Image Asset
                    </label>
                    <input
                      type="url"
                      value={manualForm.imageUrl}
                      onChange={(e) => setManualForm({ ...manualForm, imageUrl: e.target.value })}
                      placeholder="https://images.unsplash.com/..."
                      className="w-full bg-[#1b1e1e] border border-white/15 px-3 py-2 text-white"
                    />
                    <div className="flex flex-wrap gap-2 pt-1">
                      <span className="text-[10px] text-neutral-500 uppercase">Presets:</span>
                      {PRESET_IMAGES.map((preset) => (
                        <button
                          key={preset.label}
                          type="button"
                          onClick={() => setManualForm({ ...manualForm, imageUrl: preset.url })}
                          className={`text-[10px] px-2 py-0.5 border cursor-pointer ${
                            manualForm.imageUrl === preset.url
                              ? 'border-[#dfff00] text-[#dfff00] bg-[#dfff00]/10'
                              : 'border-white/10 text-neutral-400 hover:text-white'
                          }`}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Checkboxes */}
                  <div className="flex flex-wrap items-center gap-6 pt-2 font-technical text-xs">
                    <label className="flex items-center gap-2 cursor-pointer text-white">
                      <input
                        type="checkbox"
                        checked={manualForm.selected}
                        onChange={(e) => setManualForm({ ...manualForm, selected: e.target.checked })}
                        className="w-4 h-4 accent-[#dfff00]"
                      />
                      <span className="uppercase tracking-wider">Show on Portfolio Immediately</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer text-white">
                      <input
                        type="checkbox"
                        checked={manualForm.featured}
                        onChange={(e) => setManualForm({ ...manualForm, featured: e.target.checked })}
                        className="w-4 h-4 accent-[#dfff00]"
                      />
                      <span className="uppercase tracking-wider">Featured on Hero Showcase</span>
                    </label>
                  </div>

                  {/* Form Actions */}
                  <div className="pt-4 border-t border-white/10 flex items-center justify-end gap-3 font-technical text-xs">
                    <button
                      type="button"
                      onClick={() => setActivePart('current')}
                      className="px-4 py-2 border border-white/15 text-neutral-300 hover:text-white cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-6 py-2.5 bg-[#dfff00] text-[#121414] font-bold uppercase tracking-wider hover:bg-[#ccee00] transition-colors flex items-center gap-2 cursor-pointer shadow-md"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add Project to Portfolio</span>
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* 3. MODALS: EDIT PROJECT & DELETE CONFIRMATION */}
      {/* ======================================================== */}

      {/* Edit Project Modal */}
      {editingProject && (
        <div className="fixed inset-0 z-60 bg-black/85 flex items-center justify-center p-4">
          <div className="bg-[#171919] border border-[#dfff00]/40 w-full max-w-3xl p-6 space-y-5 font-sans text-neutral-200 max-h-[90vh] overflow-y-auto rounded-xs">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <h3 className="text-white font-display font-bold text-lg flex items-center gap-2">
                  <Edit3 className="w-4 h-4 text-[#dfff00]" />
                  <span>Edit Portfolio Card Architecture</span>
                </h3>
                <p className="font-technical text-xs text-neutral-400 mt-0.5">
                  Update specifications for &quot;{editingProject.title}&quot;. Changes are saved directly to your protected portfolio registry.
                </p>
              </div>
              <button
                onClick={() => setEditingProject(null)}
                className="text-neutral-400 hover:text-white cursor-pointer p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Grid 1: Basic Identifiers */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-technical text-xs">
              <div>
                <label className="block text-white/80 mb-1 uppercase tracking-wider font-bold">
                  Project Title *
                </label>
                <input
                  type="text"
                  required
                  value={editFormData.title || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })}
                  placeholder="e.g. Subdomain Recon Engine"
                  className="w-full bg-[#1b1e1e] border border-white/15 px-3 py-2 text-white focus:outline-none focus:border-[#dfff00]"
                />
              </div>

              <div>
                <label className="block text-white/80 mb-1 uppercase tracking-wider font-bold">
                  Subtitle / Role
                </label>
                <input
                  type="text"
                  value={editFormData.subtitle || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, subtitle: e.target.value })}
                  placeholder="e.g. CYBERSECURITY _ RECON PROTOCOL"
                  className="w-full bg-[#1b1e1e] border border-white/15 px-3 py-2 text-white focus:outline-none focus:border-[#dfff00]"
                />
              </div>

              <div>
                <label className="block text-white/80 mb-1 uppercase tracking-wider font-bold">
                  Category Domain *
                </label>
                <select
                  value={editFormData.category || 'Fullstack'}
                  onChange={(e) =>
                    setEditFormData({
                      ...editFormData,
                      category: e.target.value as ProjectCategory,
                    })
                  }
                  className="w-full bg-[#1b1e1e] border border-white/15 px-3 py-2 text-white focus:outline-none focus:border-[#dfff00]"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-white/80 mb-1 uppercase tracking-wider font-bold">
                  Primary Programming Language
                </label>
                <input
                  type="text"
                  value={editFormData.language || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, language: e.target.value })}
                  placeholder="e.g. Python, TypeScript, Rust, C++"
                  className="w-full bg-[#1b1e1e] border border-white/15 px-3 py-2 text-white focus:outline-none focus:border-[#dfff00]"
                />
              </div>
            </div>

            {/* Descriptions & Tags */}
            <div className="space-y-4 font-technical text-xs">
              <div>
                <label className="block text-white/80 mb-1 uppercase tracking-wider font-bold">
                  Overview Description * (Short summary for card)
                </label>
                <textarea
                  rows={2}
                  required
                  value={editFormData.description || ''}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, description: e.target.value })
                  }
                  placeholder="High-performance asynchronous reconnaissance engine engineered for sub-second DNS bruteforcing..."
                  className="w-full bg-[#1b1e1e] border border-white/15 px-3 py-2 text-white focus:outline-none focus:border-[#dfff00]"
                />
              </div>

              <div>
                <label className="block text-white/80 mb-1 uppercase tracking-wider font-bold">
                  Architectural Specifications (In-depth architecture details)
                </label>
                <textarea
                  rows={3}
                  value={editFormData.detailedOverview || ''}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, detailedOverview: e.target.value })
                  }
                  placeholder="Employs ring buffers and zero-copy deserialization to handle 100k packets per second without packet drop..."
                  className="w-full bg-[#1b1e1e] border border-white/15 px-3 py-2 text-white focus:outline-none focus:border-[#dfff00]"
                />
              </div>

              <div>
                <label className="block text-white/80 mb-1 uppercase tracking-wider font-bold">
                  Technical Primitives / Tags (comma separated)
                </label>
                <input
                  type="text"
                  value={(editFormData.tags || []).join(', ')}
                  onChange={(e) =>
                    setEditFormData({
                      ...editFormData,
                      tags: e.target.value
                        .split(',')
                        .map((s) => s.trim().toUpperCase())
                        .filter(Boolean),
                    })
                  }
                  placeholder="PYTHON, FASTAPI, DOCKER, OSINT"
                  className="w-full bg-[#1b1e1e] border border-white/15 px-3 py-2 text-white focus:outline-none focus:border-[#dfff00]"
                />
              </div>
            </div>

            {/* URLs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-technical text-xs">
              <div>
                <label className="block text-white/80 mb-1 uppercase tracking-wider font-bold">
                  GitHub URL (Optional)
                </label>
                <input
                  type="url"
                  value={editFormData.githubUrl || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, githubUrl: e.target.value })}
                  placeholder="https://github.com/Jeet1466/..."
                  className="w-full bg-[#1b1e1e] border border-white/15 px-3 py-2 text-white focus:outline-none focus:border-[#dfff00]"
                />
              </div>

              <div>
                <label className="block text-white/80 mb-1 uppercase tracking-wider font-bold">
                  Live Demo URL (Optional)
                </label>
                <input
                  type="url"
                  value={editFormData.liveUrl || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, liveUrl: e.target.value })}
                  placeholder="https://..."
                  className="w-full bg-[#1b1e1e] border border-white/15 px-3 py-2 text-white focus:outline-none focus:border-[#dfff00]"
                />
              </div>
            </div>

            {/* Telemetry 4-Metric Grid */}
            <div className="pt-2 border-t border-white/10 space-y-2 font-technical text-xs">
              <span className="block text-white/80 uppercase tracking-wider font-bold">
                Telemetry Performance Metrics
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div>
                  <label className="block text-neutral-400 text-[10px] uppercase">Throughput</label>
                  <input
                    type="text"
                    value={editFormData.metrics?.throughput || ''}
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
                        metrics: {
                          ...editFormData.metrics,
                          throughput: e.target.value,
                        },
                      })
                    }
                    placeholder="e.g. 50k req/s"
                    className="w-full bg-[#1b1e1e] border border-white/15 px-2.5 py-1.5 text-white"
                  />
                </div>
                <div>
                  <label className="block text-neutral-400 text-[10px] uppercase">Latency</label>
                  <input
                    type="text"
                    value={editFormData.metrics?.latency || ''}
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
                        metrics: {
                          ...editFormData.metrics,
                          latency: e.target.value,
                        },
                      })
                    }
                    placeholder="e.g. 2.5ms p99"
                    className="w-full bg-[#1b1e1e] border border-white/15 px-2.5 py-1.5 text-white"
                  />
                </div>
                <div>
                  <label className="block text-neutral-400 text-[10px] uppercase">Uptime</label>
                  <input
                    type="text"
                    value={editFormData.metrics?.uptime || ''}
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
                        metrics: {
                          ...editFormData.metrics,
                          uptime: e.target.value,
                        },
                      })
                    }
                    placeholder="e.g. 99.99%"
                    className="w-full bg-[#1b1e1e] border border-white/15 px-2.5 py-1.5 text-white"
                  />
                </div>
                <div>
                  <label className="block text-neutral-400 text-[10px] uppercase">Nodes / Cluster</label>
                  <input
                    type="text"
                    value={editFormData.metrics?.nodes || ''}
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
                        metrics: {
                          ...editFormData.metrics,
                          nodes: e.target.value,
                        },
                      })
                    }
                    placeholder="e.g. Cluster-01"
                    className="w-full bg-[#1b1e1e] border border-white/15 px-2.5 py-1.5 text-white"
                  />
                </div>
              </div>
            </div>

            {/* Card Image Asset & Presets */}
            <div className="pt-2 border-t border-white/10 space-y-2 font-technical text-xs">
              <label className="block text-white/80 uppercase tracking-wider font-bold">
                Card Image Asset
              </label>
              <input
                type="url"
                value={editFormData.imageUrl || ''}
                onChange={(e) => setEditFormData({ ...editFormData, imageUrl: e.target.value })}
                placeholder="https://images.unsplash.com/..."
                className="w-full bg-[#1b1e1e] border border-white/15 px-3 py-2 text-white"
              />
              <div className="flex flex-wrap gap-2 pt-1">
                <span className="text-[10px] text-neutral-500 uppercase">Presets:</span>
                {PRESET_IMAGES.map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => setEditFormData({ ...editFormData, imageUrl: preset.url })}
                    className={`text-[10px] px-2 py-0.5 border cursor-pointer ${
                      editFormData.imageUrl === preset.url
                        ? 'border-[#dfff00] text-[#dfff00] bg-[#dfff00]/10'
                        : 'border-white/10 text-neutral-400 hover:text-white'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Checkboxes */}
            <div className="flex flex-wrap items-center gap-6 pt-2 font-technical text-xs">
              <label className="flex items-center gap-2 cursor-pointer text-white">
                <input
                  type="checkbox"
                  checked={editFormData.selected !== false}
                  onChange={(e) => setEditFormData({ ...editFormData, selected: e.target.checked })}
                  className="w-4 h-4 accent-[#dfff00]"
                />
                <span className="uppercase tracking-wider">Show on Portfolio Immediately</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-white">
                <input
                  type="checkbox"
                  checked={Boolean(editFormData.featured)}
                  onChange={(e) => setEditFormData({ ...editFormData, featured: e.target.checked })}
                  className="w-4 h-4 accent-[#dfff00]"
                />
                <span className="uppercase tracking-wider">Featured on Hero Showcase</span>
              </label>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10 font-technical text-xs">
              <button
                type="button"
                onClick={() => setEditingProject(null)}
                className="px-4 py-2 border border-white/15 text-neutral-300 hover:text-white cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveEdit}
                className="px-6 py-2.5 bg-[#dfff00] text-[#121414] font-bold uppercase tracking-wider hover:bg-[#ccee00] transition-colors flex items-center gap-1.5 cursor-pointer shadow-md"
              >
                <Check className="w-4 h-4" />
                <span>Save Changes</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {projectToDelete && (
        <div className="fixed inset-0 z-60 bg-black/85 flex items-center justify-center p-4">
          <div className="bg-[#171919] border border-rose-500/50 w-full max-w-md p-6 space-y-4 font-sans text-neutral-200">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-white font-display font-bold text-base flex items-center gap-2 text-rose-400">
                <Trash2 className="w-4 h-4" />
                <span>Remove Project</span>
              </h3>
              <button
                onClick={() => setProjectToDelete(null)}
                className="text-neutral-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="font-technical text-xs text-neutral-300 leading-relaxed">
              Are you sure you want to remove <strong className="text-white">&quot;{projectToDelete.title}&quot;</strong> from Current Projects?
            </p>

            <div className="p-3 bg-rose-950/20 border border-rose-800/30 rounded-xs text-[11px] font-technical text-rose-300">
              Note: This will remove the project card from your portfolio. If it was from GitHub, you can always re-add it from Part 2.
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10 font-technical text-xs">
              <button
                onClick={() => setProjectToDelete(null)}
                className="px-4 py-1.5 border border-white/15 text-white/80 hover:text-white cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteProject}
                className="px-4 py-1.5 bg-rose-600 text-white font-bold hover:bg-rose-500 cursor-pointer"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
