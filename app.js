// Book Progress Dashboard Application Logic

let appState = {
  data: null,
  activeFilter: 'all',
  searchQuery: '',
  theme: localStorage.getItem('theme') || 'dark',
  charts: {}
};

document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  loadData();
  setupEventListeners();
});

// Theme Management
function initTheme() {
  document.documentElement.setAttribute('data-theme', appState.theme);
  updateThemeIcon();
  if (appState.data) {
    renderCharts();
  }
}

function updateThemeIcon() {
  const icon = document.querySelector('.theme-icon');
  if (icon) {
    icon.textContent = appState.theme === 'dark' ? '🌙' : '☀️';
  }
}

function toggleTheme() {
  appState.theme = appState.theme === 'dark' ? 'light' : 'dark';
  localStorage.setItem('theme', appState.theme);
  initTheme();
}

// Data Fetching
async function loadData() {
  try {
    const res = await fetch('data.json');
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    appState.data = await res.json();
    renderDashboard();
  } catch (err) {
    console.error('Failed to load data.json:', err);
    document.getElementById('reading-books-list').innerHTML = `
      <div style="grid-column: 1/-1; padding: 2rem; text-align: center; color: var(--text-muted);">
        Failed to load reading data. Please check back shortly.
      </div>`;
  }
}

// Event Listeners
function setupEventListeners() {
  document.getElementById('theme-toggle').addEventListener('click', toggleTheme);

  // Filter tabs
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      e.currentTarget.classList.add('active');
      appState.activeFilter = e.currentTarget.dataset.filter;
      renderBookLists();
    });
  });

  // Search filter
  const searchInput = document.getElementById('search-input');
  searchInput.addEventListener('input', (e) => {
    appState.searchQuery = e.target.value.toLowerCase().trim();
    renderBookLists();
  });

  // Currently reading accordion toggle
  document.getElementById('heading-reading').addEventListener('click', () => {
    const section = document.getElementById('currently-reading-section');
    section.classList.toggle('collapsed');
  });

  // Charts accordion toggle
  const chartsHeader = document.getElementById('heading-charts');
  if (chartsHeader) {
    chartsHeader.addEventListener('click', () => {
      const section = document.getElementById('charts-section');
      section.classList.toggle('collapsed');
    });
  }
}

// Render Core Dashboard
function renderDashboard() {
  if (!appState.data) return;

  renderKPIs();
  updateCounts();
  renderCharts();
  renderBookLists();
}

function renderKPIs() {
  const kpis = appState.data.kpis;
  document.getElementById('kpi-books').textContent = kpis.total_finished_books;
  document.getElementById('kpi-books-sub').textContent = `${kpis.total_print_books} print • ${kpis.total_audiobooks} audio`;
  
  document.getElementById('kpi-pages').textContent = kpis.total_pages_read.toLocaleString();
  document.getElementById('kpi-audio').textContent = kpis.total_audio_hours_formatted;
  if (kpis.total_words_read && kpis.total_words_read > 0) {
    if (kpis.total_words_read >= 1000000) {
      document.getElementById('kpi-words').textContent = `${(kpis.total_words_read / 1000000).toFixed(2)}M`;
    } else {
      document.getElementById('kpi-words').textContent = kpis.total_words_read.toLocaleString();
    }
  } else {
    document.getElementById('kpi-words').textContent = '—';
  }
}

function updateCounts() {
  const books = appState.data.books;
  document.getElementById('count-all').textContent = books.length;
  document.getElementById('count-books').textContent = books.filter(b => b.format === 'book').length;
  document.getElementById('count-audio').textContent = books.filter(b => b.format === 'audiobook').length;
}

// Filter Books
function matchesFilter(book) {
  // Format filter
  if (appState.activeFilter !== 'all' && book.format !== appState.activeFilter) {
    return false;
  }
  // Search query
  if (appState.searchQuery) {
    const q = appState.searchQuery;
    const titleMatch = book.title.toLowerCase().includes(q);
    const authorMatch = book.author.toLowerCase().includes(q);
    const genreMatch = (book.genres || []).some(g => g.toLowerCase().includes(q));
    const langMatch = (book.language || '').toLowerCase().includes(q);
    if (!titleMatch && !authorMatch && !genreMatch && !langMatch) return false;
  }
  return true;
}

function renderBookLists() {
  renderCurrentlyReading();
  renderYearlySections();
}

// Currently Reading Section
function renderCurrentlyReading() {
  const container = document.getElementById('reading-books-list');
  const badge = document.getElementById('badge-reading-count');
  const readingBooks = (appState.data.currently_reading || []).filter(matchesFilter);

  badge.textContent = readingBooks.length;
  container.innerHTML = '';

  if (readingBooks.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1/-1; padding: 1.5rem; text-align: center; color: var(--text-muted); font-size: 0.9rem;">
        No active books matching current filter.
      </div>`;
    return;
  }

  readingBooks.forEach(b => {
    container.appendChild(createBookCard(b));
  });
}

// Yearly Finished Sections
function renderYearlySections() {
  const container = document.getElementById('yearly-sections-container');
  container.innerHTML = '';

  const yearlyStats = appState.data.yearly_stats || [];

  yearlyStats.forEach(yearData => {
    const matchingBooks = yearData.books.filter(matchesFilter);
    if (matchingBooks.length === 0 && appState.searchQuery) {
      return; // Skip empty years when searching
    }

    const section = document.createElement('section');
    section.className = 'accordion-section';
    section.id = `year-section-${yearData.year}`;

    // Header summary
    const summaryText = `${matchingBooks.length} book${matchingBooks.length === 1 ? '' : 's'} • ${yearData.pages_read.toLocaleString()} pages • ${yearData.audio_hours_formatted} audio`;

    section.innerHTML = `
      <div class="accordion-header" onclick="toggleYearSection('${yearData.year}')">
        <div class="accordion-title-wrap">
          <h2 class="accordion-title">${yearData.year}</h2>
          <span class="accordion-subtitle">${summaryText}</span>
        </div>
        <span class="accordion-toggle-icon">▼</span>
      </div>
      <div class="accordion-content" id="year-books-${yearData.year}"></div>
    `;

    const contentDiv = section.querySelector(`#year-books-${yearData.year}`);
    if (matchingBooks.length === 0) {
      contentDiv.innerHTML = `
        <div style="grid-column: 1/-1; padding: 1.5rem; text-align: center; color: var(--text-muted); font-size: 0.9rem;">
          No finished books matching current filter.
        </div>`;
    } else {
      matchingBooks.forEach(b => {
        contentDiv.appendChild(createBookCard(b));
      });
    }

    container.appendChild(section);
  });
}

function toggleYearSection(year) {
  const sec = document.getElementById(`year-section-${year}`);
  if (sec) sec.classList.toggle('collapsed');
}

// Book Card Component
function createBookCard(b) {
  const card = document.createElement('div');
  card.className = 'book-card';
  card.id = `book-card-${b.id}`;

  const isAudio = b.format === 'audiobook';
  const formatBadge = isAudio
    ? `<span class="badge badge-audiobook">🎧 Audiobook</span>`
    : `<span class="badge badge-book">📖 Print/E-Book</span>`;

  // Check for re-read (if same title appears multiple times in all books)
  const allBooksList = appState.data.books || [];
  const sameTitleCount = allBooksList.filter(x => x.title.toLowerCase().trim() === b.title.toLowerCase().trim()).length;
  const rereadBadge = sameTitleCount > 1 ? `<span class="badge badge-accent">🔄 Re-read</span>` : '';

  // Star rating
  const ratingStars = formatRatingStars(b.rating);

  // Pace / duration pill
  let pacePill = '';
  if (b.status === 'reading') {
    pacePill = `<span class="pill" style="color: var(--accent-live); border: 1px solid rgba(34,197,94,0.3);">🟢 Currently Reading</span>`;
  } else if (b.pace && b.pace.rate > 0) {
    pacePill = `<span class="pill">⚡ ${b.pace.rate} ${b.pace.unit}</span>`;
  }

  // Cover fallback
  const fallbackCover = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="65" height="95" viewBox="0 0 65 95"><rect width="65" height="95" fill="%23334155"/><text x="32" y="50" font-size="20" fill="%2394a3b8" text-anchor="middle" dominant-baseline="middle">📚</text></svg>';
  const coverSrc = b.cover_url || fallbackCover;

  card.innerHTML = `
    <div class="book-main">
      <div class="book-cover-wrap">
        <img class="book-cover" src="${coverSrc}" alt="${b.title}" loading="lazy" onerror="this.src='${fallbackCover}'">
      </div>
      <div class="book-info">
        <div class="book-top">
          <div style="display: flex; gap: 0.35rem; align-items: center; flex-wrap: wrap;">
            ${formatBadge}
            ${rereadBadge}
          </div>
          <div class="book-rating">${ratingStars}</div>
        </div>
        <div class="book-title">${b.title}</div>
        <div class="book-author">by ${b.author}</div>
        <div class="book-meta-pills">
          ${pacePill}
          ${isAudio ? `<span class="pill">⏱️ ${b.audio_duration_formatted}</span>` : `<span class="pill">📄 ${b.pages} pages</span>`}
          <span class="pill">🌐 ${b.language || 'English'}</span>
          <span class="pill">🗓️ ${b.duration_days} days</span>
        </div>
      </div>
    </div>
    
    <!-- Expandable Drawer -->
    <div class="book-drawer">
      <div class="drawer-row">
        <span class="drawer-label">Reading Period:</span>
        <span>${formatDateRange(b.start_date, b.end_date)}</span>
      </div>
      <div class="drawer-row">
        <span class="drawer-label">${isAudio ? 'Total Audio Duration:' : 'Page Count:'}</span>
        <span>${isAudio ? `${b.audio_duration_formatted} (${b.audio_length_minutes} mins)` : `${b.pages} pages`}</span>
      </div>
      <div class="drawer-row">
        <span class="drawer-label">Language:</span>
        <span>${b.language || 'English'}</span>
      </div>
      <div class="drawer-row">
        <span class="drawer-label">Word Count:</span>
        <span>${b.word_count ? b.word_count.toLocaleString() + ' words' : 'Not recorded'}</span>
      </div>
      ${b.genres && b.genres.length ? `
        <div class="drawer-genres">
          ${b.genres.map(g => `<span class="genre-tag">${g}</span>`).join('')}
        </div>
      ` : ''}
      ${b.notes ? `
        <div class="drawer-notes">
          “${b.notes}”
        </div>
      ` : ''}
    </div>
  `;

  // Foldable card click handler
  card.addEventListener('click', (e) => {
    card.classList.toggle('expanded');
  });

  return card;
}

// Helpers
function formatRatingStars(rating) {
  if (!rating) return '';
  const fullStars = Math.floor(rating);
  const halfStar = rating % 1 >= 0.5;
  let s = '★'.repeat(fullStars);
  if (halfStar) s += '½';
  return s;
}

function formatDateRange(start, end) {
  if (!start && !end) return 'Not recorded';
  if (start && !end) return `Started ${start}`;
  return `${start} → ${end}`;
}

// Interactive Chart.js Implementations
function getChartTheme() {
  const isDark = appState.theme === 'dark';
  return {
    textColor: isDark ? '#94a3b8' : '#475569',
    gridColor: isDark ? 'rgba(51, 65, 85, 0.4)' : 'rgba(226, 232, 240, 0.8)',
    tooltipBg: isDark ? '#1e293b' : '#ffffff',
    tooltipText: isDark ? '#f8fafc' : '#0f172a'
  };
}

function renderCharts() {
  if (typeof Chart === 'undefined' || !appState.data) return;

  renderCumulativeChart();
  renderMonthlyChart();
  renderGenreChart();
  renderFormatChart();
  renderLanguageChart();
}

function renderCumulativeChart() {
  const ctx = document.getElementById('cumulativeChart');
  if (!ctx) return;

  if (appState.charts.cumulative) {
    appState.charts.cumulative.destroy();
  }

  const timeline = appState.data.timeline || [];
  if (timeline.length === 0) return;

  // Sample points if too dense (keep ~30-40 points for clear line)
  const step = Math.max(1, Math.floor(timeline.length / 40));
  const sampled = timeline.filter((_, idx) => idx % step === 0 || idx === timeline.length - 1);

  const labels = sampled.map(p => p.date);
  const pagesData = sampled.map(p => p.cumulative_pages);
  const audioData = sampled.map(p => p.cumulative_audio_hours);

  const theme = getChartTheme();

  appState.charts.cumulative = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Cumulative Pages (Print/E-Book)',
          data: pagesData,
          borderColor: '#38bdf8',
          backgroundColor: 'rgba(56, 189, 248, 0.1)',
          fill: true,
          tension: 0.3,
          borderWidth: 2.5,
          pointRadius: 0,
          pointHoverRadius: 5,
          yAxisID: 'y'
        },
        {
          label: 'Cumulative Audio (Hours)',
          data: audioData,
          borderColor: '#a855f7',
          backgroundColor: 'rgba(168, 85, 247, 0.1)',
          fill: true,
          tension: 0.3,
          borderWidth: 2.5,
          pointRadius: 0,
          pointHoverRadius: 5,
          yAxisID: 'y1'
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false
      },
      plugins: {
        legend: {
          labels: { color: theme.textColor, font: { size: 11, weight: '600' } }
        },
        tooltip: {
          backgroundColor: theme.tooltipBg,
          titleColor: theme.tooltipText,
          bodyColor: theme.tooltipText,
          borderColor: theme.gridColor,
          borderWidth: 1
        }
      },
      scales: {
        x: {
          grid: { color: theme.gridColor },
          ticks: {
            color: theme.textColor,
            maxTicksLimit: 8,
            font: { size: 10 }
          }
        },
        y: {
          type: 'linear',
          display: true,
          position: 'left',
          grid: { color: theme.gridColor },
          ticks: { color: theme.textColor, font: { size: 10 } },
          title: { display: true, text: 'Pages', color: '#38bdf8', font: { size: 11 } }
        },
        y1: {
          type: 'linear',
          display: true,
          position: 'right',
          grid: { drawOnChartArea: false },
          ticks: { color: theme.textColor, font: { size: 10 } },
          title: { display: true, text: 'Hours', color: '#a855f7', font: { size: 11 } }
        }
      }
    }
  });
}

function renderMonthlyChart() {
  const ctx = document.getElementById('monthlyChart');
  if (!ctx) return;

  if (appState.charts.monthly) {
    appState.charts.monthly.destroy();
  }

  const monthlyStats = appState.data.monthly_stats || [];
  if (monthlyStats.length === 0) return;

  const labels = monthlyStats.map(m => m.label);
  const pages = monthlyStats.map(m => m.pages);
  const audioHours = monthlyStats.map(m => m.audio_hours);

  const theme = getChartTheme();

  appState.charts.monthly = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Pages Read',
          data: pages,
          backgroundColor: 'rgba(56, 189, 248, 0.85)',
          borderRadius: 4,
          yAxisID: 'y'
        },
        {
          label: 'Audio Hours',
          data: audioHours,
          backgroundColor: 'rgba(168, 85, 247, 0.85)',
          borderRadius: 4,
          yAxisID: 'y1'
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false
      },
      plugins: {
        legend: {
          labels: { color: theme.textColor, font: { size: 11, weight: '600' } }
        },
        tooltip: {
          backgroundColor: theme.tooltipBg,
          titleColor: theme.tooltipText,
          bodyColor: theme.tooltipText,
          borderColor: theme.gridColor,
          borderWidth: 1
        }
      },
      scales: {
        x: {
          grid: { color: theme.gridColor },
          ticks: { color: theme.textColor, font: { size: 10 } }
        },
        y: {
          type: 'linear',
          display: true,
          position: 'left',
          grid: { color: theme.gridColor },
          ticks: { color: theme.textColor, font: { size: 10 } },
          title: { display: true, text: 'Pages', color: '#38bdf8', font: { size: 11 } }
        },
        y1: {
          type: 'linear',
          display: true,
          position: 'right',
          grid: { drawOnChartArea: false },
          ticks: { color: theme.textColor, font: { size: 10 } },
          title: { display: true, text: 'Hours', color: '#a855f7', font: { size: 11 } }
        }
      }
    }
  });
}

function renderGenreChart() {
  const ctx = document.getElementById('genreChart');
  if (!ctx) return;

  if (appState.charts.genre) {
    appState.charts.genre.destroy();
  }

  const genreCounts = (appState.data.genre_counts || []).slice(0, 6);
  if (genreCounts.length === 0) return;

  const labels = genreCounts.map(g => g.genre);
  const data = genreCounts.map(g => g.count);

  const theme = getChartTheme();
  const palette = ['#38bdf8', '#a855f7', '#10b981', '#f59e0b', '#ec4899', '#6366f1'];

  appState.charts.genre = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: labels,
      datasets: [{
        data: data,
        backgroundColor: palette,
        borderColor: theme.tooltipBg,
        borderWidth: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'right',
          labels: { color: theme.textColor, boxWidth: 12, font: { size: 10 } }
        },
        tooltip: {
          backgroundColor: theme.tooltipBg,
          titleColor: theme.tooltipText,
          bodyColor: theme.tooltipText,
          borderColor: theme.gridColor,
          borderWidth: 1
        }
      },
      cutout: '65%'
    }
  });
}

function renderFormatChart() {
  const ctx = document.getElementById('formatChart');
  if (!ctx) return;

  if (appState.charts.format) {
    appState.charts.format.destroy();
  }

  const kpis = appState.data.kpis;
  const labels = ['Print / E-Books', 'Audiobooks'];
  const data = [kpis.total_print_books, kpis.total_audiobooks];

  const theme = getChartTheme();

  appState.charts.format = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: labels,
      datasets: [{
        data: data,
        backgroundColor: ['#10b981', '#a855f7'],
        borderColor: theme.tooltipBg,
        borderWidth: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'right',
          labels: { color: theme.textColor, boxWidth: 12, font: { size: 10 } }
        },
        tooltip: {
          backgroundColor: theme.tooltipBg,
          titleColor: theme.tooltipText,
          bodyColor: theme.tooltipText,
          borderColor: theme.gridColor,
          borderWidth: 1
        }
      },
      cutout: '65%'
    }
  });
}

function renderLanguageChart() {
  const ctx = document.getElementById('languageChart');
  if (!ctx) return;

  if (appState.charts.language) {
    appState.charts.language.destroy();
  }

  const langCounts = appState.data.language_counts || [];
  if (langCounts.length === 0) return;

  const labels = langCounts.map(l => l.language);
  const data = langCounts.map(l => l.count);

  const theme = getChartTheme();
  const palette = ['#06b6d4', '#f59e0b', '#3b82f6', '#ec4899', '#10b981', '#8b5cf6'];

  appState.charts.language = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: labels,
      datasets: [{
        data: data,
        backgroundColor: palette,
        borderColor: theme.tooltipBg,
        borderWidth: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'right',
          labels: { color: theme.textColor, boxWidth: 12, font: { size: 10 } }
        },
        tooltip: {
          backgroundColor: theme.tooltipBg,
          titleColor: theme.tooltipText,
          bodyColor: theme.tooltipText,
          borderColor: theme.gridColor,
          borderWidth: 1
        }
      },
      cutout: '65%'
    }
  });
}
