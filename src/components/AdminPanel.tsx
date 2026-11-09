/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useId } from 'react';
import { useApp } from '../data/store';
import { Project, ProjectCategory } from '../types';
import {
  FolderGit2,
  CheckSquare,
  Square,
  Search,
  Download,
  Upload,
  Copy,
  Check,
  RefreshCw,
  ExternalLink,
  Edit3,
  X,
  Star,
  GitFork,
  SlidersHorizontal,
  ChevronRight,
  Database,
  ArrowLeft,
  Sparkles
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
    toggleProjectSelection,
    selectAllProjects,
    setIsAdminOpen,
    setScreen,
  } = useApp();

  const [githubUsername, setGithubUsername] = useState('Jeet1466');
  const [isLoading, setIsLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [fetchSuccess, setFetchSuccess] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState<string>('All');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectionFilter, setSelectionFilter] = useState<'all' | 'selected' | 'unselected'>('all');

  const [copied, setCopied] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<Project>>({});

  const fileInputId = useId();

  // Close admin panel
  const handleClose = () => {
    setIsAdminOpen(false);
    setScreen('portfolio');
  };

  // Sync / fetch from GitHub API
  const handleFetchFromGithub = async () => {
    if (!githubUsername.trim()) return;
    setIsLoading(true);
    setFetchError(null);
    setFetchSuccess(null);

    try {
      const response = await fetch(
        `https://api.github.com/users/${encodeURIComponent(githubUsername.trim())}/repos?sort=updated&per_page=100`
      );

      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
      }

      const repos: GitHubRepoResponse[] = await response.json();

      // Transform into our Project shape, preserving any existing project overrides
      const existingMap = new Map(projects.map((p) => [p.title.toLowerCase(), p]));

      const mappedProjects: Project[] = repos.map((repo) => {
        const existing = existingMap.get(repo.name.toLowerCase());

        let category: ProjectCategory = 'Fullstack';
        const lang = repo.language?.toLowerCase() || '';
        const name = repo.name.toLowerCase();
        const desc = (repo.description || '').toLowerCase();

        if (
          name.includes('cyber') ||
          name.includes('subsurf') ||
          desc.includes('subdomain') ||
          desc.includes('security')
        ) {
          category = 'Cybersecurity';
        } else if (
          lang === 'python' ||
          name.includes('ai') ||
          name.includes('ml') ||
          desc.includes('neural') ||
          desc.includes('model')
        ) {
          category = 'AI / ML';
        } else if (
          lang === 'c++' ||
          lang === 'rust' ||
          lang === 'c' ||
          name.includes('sphere') ||
          name.includes('engine')
        ) {
          category = 'Systems';
        } else if (name.includes('infra') || name.includes('docker') || name.includes('cloud')) {
          category = 'Infrastructure';
        }

        return {
          id: existing?.id || `gh-${repo.id}`,
          title: existing?.title || repo.name,
          subtitle: existing?.subtitle || `${repo.language || 'Software'} Architecture`,
          category: existing?.category || category,
          description:
            existing?.description ||
            repo.description ||
            `Public repository ${repo.name} by ${githubUsername}`,
          detailedOverview:
            existing?.detailedOverview ||
            repo.description ||
            `High-performance repository engineered with ${repo.language || 'modern toolchains'}.`,
          tags:
            existing?.tags && existing.tags.length > 0
              ? existing.tags
              : repo.topics && repo.topics.length > 0
                ? repo.topics.slice(0, 4)
                : [repo.language || 'Code', 'Open Source', 'GitHub'],
          metrics: existing?.metrics || {
            throughput: `${repo.stargazers_count} Stars`,
            latency: `${repo.forks_count} Forks`,
            uptime: '99.9%',
            nodes: 'Distributed',
          },
          imageUrl:
            existing?.imageUrl ||
            'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=1200&q=80',
          imageAlt: existing?.imageAlt || repo.name,
          githubUrl: repo.html_url,
          liveUrl: existing?.liveUrl || repo.homepage || undefined,
          featured: existing?.featured ?? repo.stargazers_count > 0,
          gridSpan: existing?.gridSpan || 'normal',
          updatedAt: repo.updated_at || new Date().toISOString(),
          stars: repo.stargazers_count,
          forks: repo.forks_count,
          language: repo.language || undefined,
          topics: repo.topics || [],
          repoName: repo.full_name,
          selected: existing?.selected ?? true,
        };
      });

      setProjects(mappedProjects);
      setFetchSuccess(`Successfully synced ${mappedProjects.length} repositories from @${githubUsername}`);
      setTimeout(() => setFetchSuccess(null), 5000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to connect to GitHub';
      setFetchError(`${msg}. (Rate limits apply to anonymous calls)`);
      setTimeout(() => setFetchError(null), 7000);
    } finally {
      setIsLoading(false);
    }
  };

  // Export JSON (All or Selected)
  const handleExportJSON = (onlySelected: boolean) => {
    const dataToExport = onlySelected ? projects.filter((p) => p.selected !== false) : projects;
    const blob = new Blob([JSON.stringify(dataToExport, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `github-projects-${githubUsername}-${onlySelected ? 'selected' : 'all'}-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Copy JSON to clipboard
  const handleCopyJSON = () => {
    const selected = projects.filter((p) => p.selected !== false);
    navigator.clipboard.writeText(JSON.stringify(selected, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  // Import JSON configuration
  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (Array.isArray(parsed)) {
          setProjects(parsed);
          setFetchSuccess(`Imported ${parsed.length} projects successfully.`);
          setTimeout(() => setFetchSuccess(null), 4000);
        } else {
          setFetchError('Invalid JSON format: expected an array of project items.');
        }
      } catch {
        setFetchError('Failed to parse uploaded JSON file.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Open Edit Modal
  const openEditModal = (p: Project) => {
    setEditingProject(p);
    setEditFormData({ ...p });
  };

  const saveEdit = () => {
    if (!editingProject) return;
    setProjects(
      projects.map((p) => (p.id === editingProject.id ? ({ ...p, ...editFormData } as Project) : p))
    );
    setEditingProject(null);
  };

  // Computed lists
  const availableLanguages = [
    'All',
    ...Array.from(new Set(projects.map((p) => p.language).filter(Boolean) as string[])),
  ];

  const filteredProjects = projects.filter((p) => {
    // Search query
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      p.title.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q) ||
      p.tags.some((t) => t.toLowerCase().includes(q)) ||
      (p.language && p.language.toLowerCase().includes(q));

    // Language
    const matchesLang = selectedLanguage === 'All' || p.language === selectedLanguage;

    // Category
    const matchesCat = selectedCategory === 'All' || p.category === selectedCategory;

    // Selection
    const matchesSel =
      selectionFilter === 'all' ||
      (selectionFilter === 'selected' && p.selected !== false) ||
      (selectionFilter === 'unselected' && p.selected === false);

    return matchesSearch && matchesLang && matchesCat && matchesSel;
  });

  const selectedCount = projects.filter((p) => p.selected !== false).length;

  return (
    <div className="fixed inset-0 z-50 bg-[#121414] text-[#e2e2e2] flex flex-col overflow-hidden font-sans">
      {/* Top Bar - Strict matching with main website header */}
      <header className="h-16 border-b border-white/10 bg-[#0d0f0f] px-6 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <button
            onClick={handleClose}
            className="flex items-center gap-2 px-3 py-1.5 border border-white/15 text-white/80 hover:text-white hover:border-[#dfff00]/50 font-['JetBrains_Mono'] text-xs uppercase tracking-wider transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Portfolio</span>
          </button>

          <div className="h-5 w-px bg-white/10 hidden sm:block" />

          <div className="flex items-center gap-2.5">
            <span className="text-[#dfff00] font-['JetBrains_Mono'] font-bold text-sm tracking-wider">
              [ADMIN_CONSOLE]
            </span>
            <span className="text-white/40 font-['JetBrains_Mono'] text-xs hidden md:inline">
              // GITHUB REPO MANAGER & CARD SYNC
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden lg:flex items-center gap-2 text-xs font-['JetBrains_Mono'] text-neutral-400">
            <span>SHOWING ON PORTFOLIO:</span>
            <span className="text-[#dfff00] font-bold">
              {selectedCount} / {projects.length}
            </span>
          </div>

          <button
            onClick={handleClose}
            className="flex items-center gap-2 px-4 py-2 bg-[#dfff00] text-[#121414] font-['JetBrains_Mono'] font-bold text-xs uppercase tracking-wider hover:bg-[#ccee00] transition-colors"
          >
            <span>Done</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* Main Workspace */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Left Control Sidebar */}
        <aside className="w-full lg:w-80 border-b lg:border-b-0 lg:border-r border-white/10 bg-[#141616] p-5 flex flex-col gap-6 overflow-y-auto shrink-0">
          {/* GitHub Sync Block */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label
                htmlFor="gh-user-input"
                className="text-xs font-['JetBrains_Mono'] font-bold uppercase tracking-wider text-white/70 flex items-center gap-2"
              >
                <FolderGit2 className="w-3.5 h-3.5 text-[#dfff00]" />
                <span>GitHub Source</span>
              </label>
              <span className="text-[10px] font-['JetBrains_Mono'] text-[#dfff00]">LIVE API</span>
            </div>

            <div className="flex gap-2">
              <input
                id="gh-user-input"
                type="text"
                value={githubUsername}
                onChange={(e) => setGithubUsername(e.target.value)}
                placeholder="GitHub Username"
                className="flex-1 bg-[#1a1d1d] border border-white/15 px-3 py-2 text-xs font-['JetBrains_Mono'] text-white focus:outline-none focus:border-[#dfff00]/60 placeholder:text-neutral-500"
              />
              <button
                onClick={handleFetchFromGithub}
                disabled={isLoading}
                title="Fetch latest repositories from GitHub"
                className="px-3 py-2 bg-[#dfff00] text-[#121414] font-['JetBrains_Mono'] font-bold text-xs hover:bg-[#ccee00] transition-colors disabled:opacity-50 flex items-center gap-1.5"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                <span>Sync</span>
              </button>
            </div>

            {fetchSuccess && (
              <div className="text-[11px] font-['JetBrains_Mono'] text-[#dfff00] bg-[#dfff00]/10 border border-[#dfff00]/30 p-2">
                {fetchSuccess}
              </div>
            )}
            {fetchError && (
              <div className="text-[11px] font-['JetBrains_Mono'] text-rose-400 bg-rose-950/40 border border-rose-800/40 p-2">
                {fetchError}
              </div>
            )}
          </div>

          {/* Quick Selection Toggles */}
          <div className="space-y-3 pt-4 border-t border-white/10">
            <div className="text-xs font-['JetBrains_Mono'] font-bold uppercase tracking-wider text-white/70">
              Bulk Selection
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => selectAllProjects(true)}
                className="px-3 py-2 bg-[#1b1e1e] border border-white/10 hover:border-white/30 text-white font-['JetBrains_Mono'] text-xs uppercase flex items-center justify-center gap-1.5 transition-colors"
              >
                <CheckSquare className="w-3.5 h-3.5 text-[#dfff00]" />
                <span>Select All</span>
              </button>
              <button
                onClick={() => selectAllProjects(false)}
                className="px-3 py-2 bg-[#1b1e1e] border border-white/10 hover:border-white/30 text-neutral-400 hover:text-white font-['JetBrains_Mono'] text-xs uppercase flex items-center justify-center gap-1.5 transition-colors"
              >
                <Square className="w-3.5 h-3.5" />
                <span>Clear All</span>
              </button>
            </div>
          </div>

          {/* Export & Import Suite */}
          <div className="space-y-3 pt-4 border-t border-white/10">
            <div className="text-xs font-['JetBrains_Mono'] font-bold uppercase tracking-wider text-white/70 flex items-center justify-between">
              <span>Data Export</span>
              <span className="text-[10px] text-neutral-400">JSON</span>
            </div>

            <div className="space-y-2">
              <button
                onClick={() => handleExportJSON(false)}
                className="w-full px-3 py-2 bg-[#1b1e1e] border border-white/15 hover:border-white/30 text-white font-['JetBrains_Mono'] text-xs uppercase flex items-center justify-between transition-colors"
              >
                <span className="flex items-center gap-2">
                  <Download className="w-3.5 h-3.5 text-[#dfff00]" />
                  <span>Export All Repos</span>
                </span>
                <span className="text-neutral-500 text-[10px]">({projects.length})</span>
              </button>

              <button
                onClick={() => handleExportJSON(true)}
                className="w-full px-3 py-2 bg-[#1b1e1e] border border-white/15 hover:border-[#dfff00]/50 text-white font-['JetBrains_Mono'] text-xs uppercase flex items-center justify-between transition-colors"
              >
                <span className="flex items-center gap-2">
                  <Download className="w-3.5 h-3.5 text-[#dfff00]" />
                  <span>Export Selected</span>
                </span>
                <span className="text-[#dfff00] font-bold text-[10px]">({selectedCount})</span>
              </button>

              <button
                onClick={handleCopyJSON}
                className="w-full px-3 py-2 bg-[#1b1e1e] border border-white/15 hover:border-white/30 text-white font-['JetBrains_Mono'] text-xs uppercase flex items-center justify-between transition-colors"
              >
                <span className="flex items-center gap-2">
                  {copied ? (
                    <Check className="w-3.5 h-3.5 text-[#dfff00]" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 text-neutral-400" />
                  )}
                  <span>{copied ? 'Copied to Clipboard!' : 'Copy Selected JSON'}</span>
                </span>
              </button>

              <label
                htmlFor={fileInputId}
                className="w-full px-3 py-2 bg-[#1b1e1e] border border-dashed border-white/20 hover:border-white/40 text-neutral-300 font-['JetBrains_Mono'] text-xs uppercase flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                <Upload className="w-3.5 h-3.5 text-neutral-400" />
                <span>Import JSON File</span>
                <input
                  id={fileInputId}
                  type="file"
                  accept=".json,application/json"
                  onChange={handleImportJSON}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Active Statistics Card */}
          <div className="mt-auto pt-4 border-t border-white/10 text-xs font-['JetBrains_Mono'] space-y-1.5 text-neutral-400">
            <div className="flex justify-between">
              <span>Total Repositories:</span>
              <span className="text-white font-bold">{projects.length}</span>
            </div>
            <div className="flex justify-between">
              <span>Active Portfolio Cards:</span>
              <span className="text-[#dfff00] font-bold">{selectedCount}</span>
            </div>
            <div className="flex justify-between">
              <span>Total Star Count:</span>
              <span className="text-white font-bold">
                {projects.reduce((acc, p) => acc + (p.stars || 0), 0)}
              </span>
            </div>
          </div>
        </aside>

        {/* Right Repository Showcase & Management */}
        <main className="flex-1 flex flex-col bg-[#121414] overflow-hidden">
          {/* Filter Bar */}
          <div className="border-b border-white/10 bg-[#161818] p-4 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between shrink-0">
            {/* Search Box */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by repo title, tags, or description..."
                className="w-full bg-[#1b1e1e] border border-white/15 pl-9 pr-3 py-1.5 text-xs font-['JetBrains_Mono'] text-white focus:outline-none focus:border-[#dfff00]/60 placeholder:text-neutral-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filter Pills */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Category selector */}
              <select
                aria-label="Filter projects by domain category"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="bg-[#1b1e1e] border border-white/15 px-3 py-1.5 text-xs font-['JetBrains_Mono'] text-neutral-300 focus:outline-none focus:border-[#dfff00]/60"
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
                aria-label="Filter projects by programming language"
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value)}
                className="bg-[#1b1e1e] border border-white/15 px-3 py-1.5 text-xs font-['JetBrains_Mono'] text-neutral-300 focus:outline-none focus:border-[#dfff00]/60"
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
                  className={`px-2.5 py-1 text-xs font-['JetBrains_Mono'] uppercase transition-colors ${
                    selectionFilter === 'all'
                      ? 'bg-[#dfff00] text-[#121414] font-bold'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setSelectionFilter('selected')}
                  className={`px-2.5 py-1 text-xs font-['JetBrains_Mono'] uppercase transition-colors ${
                    selectionFilter === 'selected'
                      ? 'bg-[#dfff00] text-[#121414] font-bold'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  Active ({selectedCount})
                </button>
                <button
                  onClick={() => setSelectionFilter('unselected')}
                  className={`px-2.5 py-1 text-xs font-['JetBrains_Mono'] uppercase transition-colors ${
                    selectionFilter === 'unselected'
                      ? 'bg-[#dfff00] text-[#121414] font-bold'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  Hidden
                </button>
              </div>
            </div>
          </div>

          {/* Repositories Card Grid */}
          <div className="flex-1 p-6 overflow-y-auto">
            {filteredProjects.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center text-center p-6 border border-dashed border-white/15 bg-[#161818]/60">
                <SlidersHorizontal className="w-8 h-8 text-neutral-500 mb-3" />
                <h3 className="text-white font-['Outfit'] font-bold text-base mb-1">
                  No Repositories Found
                </h3>
                <p className="text-neutral-400 font-['JetBrains_Mono'] text-xs max-w-sm mb-4">
                  No projects match your current filters or search query.
                </p>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedLanguage('All');
                    setSelectedCategory('All');
                    setSelectionFilter('all');
                  }}
                  className="px-3 py-1.5 border border-white/20 text-white font-['JetBrains_Mono'] text-xs hover:border-[#dfff00]/50"
                >
                  Reset All Filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredProjects.map((project) => {
                  const isSelected = project.selected !== false;
                  const langColor =
                    (project.language && LANGUAGE_COLORS[project.language]) || '#8a8d90';

                  return (
                    <div
                      key={project.id}
                      className={`relative flex flex-col bg-[#171919] border transition-all duration-150 ${
                        isSelected
                          ? 'border-[#dfff00]/40'
                          : 'border-white/10 opacity-70 hover:opacity-100'
                      }`}
                    >
                      {/* Top Action Ribbon */}
                      <div className="p-3.5 border-b border-white/10 flex items-center justify-between bg-[#141616]">
                        {/* Checkbox Toggle */}
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
                            className={`text-xs font-['JetBrains_Mono'] font-bold uppercase tracking-wider ${
                              isSelected ? 'text-[#dfff00]' : 'text-neutral-400'
                            }`}
                          >
                            {isSelected ? 'Show on Portfolio' : 'Hidden'}
                          </span>
                        </button>

                        {/* Edit Button */}
                        <button
                          onClick={() => openEditModal(project)}
                          className="flex items-center gap-1 px-2 py-1 border border-white/10 hover:border-white/30 text-neutral-400 hover:text-white font-['JetBrains_Mono'] text-[11px] transition-colors"
                          title="Edit Card Details"
                        >
                          <Edit3 className="w-3 h-3" />
                          <span>Edit</span>
                        </button>
                      </div>

                      {/* Card Body */}
                      <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                        <div className="space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="text-white font-['Outfit'] font-bold text-base tracking-tight hover:text-[#dfff00] transition-colors line-clamp-1">
                              {project.title}
                            </h4>
                            <span className="text-[10px] font-['JetBrains_Mono'] text-white/60 bg-white/5 border border-white/10 px-2 py-0.5 shrink-0">
                              {project.category}
                            </span>
                          </div>

                          <p className="text-neutral-400 text-xs line-clamp-2 leading-relaxed">
                            {project.description}
                          </p>
                        </div>

                        {/* Tech Tags */}
                        {project.tags && project.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {project.tags.slice(0, 3).map((tag) => (
                              <span
                                key={tag}
                                className="text-[10px] font-['JetBrains_Mono'] text-neutral-300 bg-white/[0.04] px-1.5 py-0.5 border border-white/5"
                              >
                                #{tag}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Footer stats & links */}
                        <div className="pt-3 border-t border-white/10 flex items-center justify-between text-xs font-['JetBrains_Mono'] text-neutral-400">
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
        </main>
      </div>

      {/* Edit Project Modal */}
      {editingProject && (
        <div className="fixed inset-0 z-60 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-[#171919] border border-white/20 w-full max-w-lg p-6 space-y-4 font-sans text-neutral-200">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-white font-['Outfit'] font-bold text-lg flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-[#dfff00]" />
                <span>Edit Portfolio Card</span>
              </h3>
              <button
                onClick={() => setEditingProject(null)}
                className="text-neutral-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 font-['JetBrains_Mono'] text-xs">
              <div>
                <label className="block text-white/70 mb-1 uppercase tracking-wider">
                  Project Title
                </label>
                <input
                  type="text"
                  value={editFormData.title || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })}
                  className="w-full bg-[#1b1e1e] border border-white/15 px-3 py-2 text-white focus:outline-none focus:border-[#dfff00]"
                />
              </div>

              <div>
                <label className="block text-white/70 mb-1 uppercase tracking-wider">
                  Category Domain
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
                <label className="block text-white/70 mb-1 uppercase tracking-wider">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={editFormData.description || ''}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, description: e.target.value })
                  }
                  className="w-full bg-[#1b1e1e] border border-white/15 px-3 py-2 text-white focus:outline-none focus:border-[#dfff00]"
                />
              </div>

              <div>
                <label className="block text-white/70 mb-1 uppercase tracking-wider">
                  Demo / Live URL
                </label>
                <input
                  type="text"
                  value={editFormData.liveUrl || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, liveUrl: e.target.value })}
                  placeholder="https://..."
                  className="w-full bg-[#1b1e1e] border border-white/15 px-3 py-2 text-white focus:outline-none focus:border-[#dfff00]"
                />
              </div>

              <div>
                <label className="block text-white/70 mb-1 uppercase tracking-wider">
                  Tags (comma separated)
                </label>
                <input
                  type="text"
                  value={(editFormData.tags || []).join(', ')}
                  onChange={(e) =>
                    setEditFormData({
                      ...editFormData,
                      tags: e.target.value
                        .split(',')
                        .map((s) => s.trim())
                        .filter(Boolean),
                    })
                  }
                  className="w-full bg-[#1b1e1e] border border-white/15 px-3 py-2 text-white focus:outline-none focus:border-[#dfff00]"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="featured-checkbox"
                  checked={Boolean(editFormData.featured)}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, featured: e.target.checked })
                  }
                  className="w-4 h-4 accent-[#dfff00]"
                />
                <label
                  htmlFor="featured-checkbox"
                  className="text-white/80 uppercase tracking-wider cursor-pointer"
                >
                  Featured on Hero Showcase
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10 font-['JetBrains_Mono'] text-xs">
              <button
                onClick={() => setEditingProject(null)}
                className="px-4 py-2 border border-white/15 text-white/80 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={saveEdit}
                className="px-4 py-2 bg-[#dfff00] text-[#121414] font-bold hover:bg-[#ccee00]"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
