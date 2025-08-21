// Search functionality for Claude Flow Tips
(function() {
  let searchIndex = null;
  let fuse = null;

  // Load search index
  async function loadSearchIndex() {
    try {
      const response = await fetch('/search/index.json');
      searchIndex = await response.json();
      
      // Initialize Fuse.js for fuzzy search
      fuse = new Fuse(searchIndex, {
        keys: ['title', 'content', 'summary', 'topics', 'keywords'],
        threshold: 0.3,
        includeScore: true
      });
    } catch (error) {
      console.error('Failed to load search index:', error);
    }
  }

  // Perform search
  function search(query) {
    if (!fuse || !query) return [];
    
    const results = fuse.search(query);
    return results.slice(0, 10).map(r => r.item);
  }

  // Display results
  function displayResults(results) {
    const container = document.getElementById('search-results');
    if (!container) return;

    if (results.length === 0) {
      container.innerHTML = '<p class="no-results">No results found</p>';
      return;
    }

    const html = results.map(result => `
      <div class="search-result">
        <h3><a href="${result.url}">${result.title}</a></h3>
        <p class="category">${result.category}</p>
        <p class="summary">${result.summary}</p>
        <p class="topics">${result.topics.join(', ')}</p>
      </div>
    `).join('');

    container.innerHTML = html;
  }

  // Initialize on page load
  document.addEventListener('DOMContentLoaded', async () => {
    await loadSearchIndex();

    const searchInput = document.getElementById('search-input');
    if (searchInput) {
      let debounceTimer;
      
      searchInput.addEventListener('input', (e) => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          const query = e.target.value.trim();
          if (query.length > 2) {
            const results = search(query);
            displayResults(results);
          } else {
            document.getElementById('search-results').innerHTML = '';
          }
        }, 300);
      });
    }
  });
})();
