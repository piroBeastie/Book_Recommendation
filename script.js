class LibraryManager {
    constructor() {
        this.books = JSON.parse(localStorage.getItem('library')) || [];
        this.googleBooksAPI = 'https://www.googleapis.com/books/v1/volumes';
    }

    async searchBooks(query, genre = '') {
        try {
            let searchQuery = query;
            if (genre) {
                searchQuery += `+subject:${genre}`;
            }
            
            const response = await fetch(
                `${this.googleBooksAPI}?q=${encodeURIComponent(searchQuery)}&maxResults=20`
            );
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            
            if (!data.items) {
                return [];
            }

            return data.items.map(item => ({
                googleId: item.id,
                title: item.volumeInfo.title || 'Untitled',
                author: item.volumeInfo.authors ? item.volumeInfo.authors[0] : 'Unknown Author',
                genre: item.volumeInfo.categories ? item.volumeInfo.categories[0] : genre || 'Uncategorized',
                coverUrl: item.volumeInfo.imageLinks ? 
                    item.volumeInfo.imageLinks.thumbnail : 
                    'https://via.placeholder.com/128x192?text=No+Cover'
            }));
        } catch (error) {
            console.error('Error searching books:', error);
            return [];
        }
    }

    addBook(book) {
        const isDuplicate = this.books.some(existingBook => 
            existingBook.googleId === book.googleId
        );

        if (!isDuplicate) {
            const newBook = {
                id: Date.now(),
                title: book.title,
                author: book.author,
                genre: book.genre,
                progress: 0,
                status: 'unread',
                googleId: book.googleId,
                coverUrl: book.coverUrl
            };
            this.books.push(newBook);
            this.saveToLocalStorage();
            return newBook;
        }
        return null;
    }

    saveToLocalStorage() {
        localStorage.setItem('library', JSON.stringify(this.books));
    }

    getBooksByGenre(genre) {
        return genre ? 
            this.books.filter(book => book.genre === genre) : 
            this.books;
    }
}

// Then add the UIManager class
class UIManager {
    constructor(libraryManager) {
        this.library = libraryManager;
        this.initializeEventListeners();
    }

    initializeEventListeners() {
        const searchForm = document.getElementById('searchForm');
        if (searchForm) {
            searchForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.handleSearch();
            });
        }

        const libraryGenreSelect = document.getElementById('libraryGenre');
        if (libraryGenreSelect) {
            libraryGenreSelect.addEventListener('change', () => {
                this.filterLibrary();
            });
        }
    }

    async handleSearch() {
        const searchInput = document.getElementById('searchInput');
        const genreSelect = document.getElementById('searchGenre');
        const searchResults = document.getElementById('searchResults');

        if (!searchInput || !searchResults) return;

        const query = searchInput.value.trim();
        const selectedGenre = genreSelect ? genreSelect.value : '';

        if (!query) {
            searchResults.innerHTML = '<p>Please enter a search term</p>';
            return;
        }

        searchResults.innerHTML = '<p>Searching...</p>';

        try {
            const results = await this.library.searchBooks(query, selectedGenre);
            this.displaySearchResults(results);
        } catch (error) {
            searchResults.innerHTML = '<p>Error searching books. Please try again.</p>';
            console.error('Search error:', error);
        }
    }

    displaySearchResults(books) {
        const resultsContainer = document.getElementById('searchResults');
        if (!resultsContainer) return;

        if (books.length === 0) {
            resultsContainer.innerHTML = '<p>No books found matching your criteria.</p>';
            return;
        }

        resultsContainer.innerHTML = books.map(book => `
            <div class="book-card">
                <img src="${book.coverUrl}" alt="${book.title}" class="book-cover">
                <div class="book-info">
                    <h3>${book.title}</h3>
                    <p>By ${book.author}</p>
                    <p>Genre: ${book.genre}</p>
                    <button onclick="app.addBookToLibrary(${JSON.stringify(book).replace(/"/g, '&quot;')})">
                        Add to Library
                    </button>
                </div>
            </div>
        `).join('');
    }

    filterLibrary() {
        const genreSelect = document.getElementById('libraryGenre');
        const selectedGenre = genreSelect ? genreSelect.value : '';
        const filteredBooks = this.library.getBooksByGenre(selectedGenre);
        this.renderLibrary(filteredBooks);
    }

    renderLibrary(books = null) {
        const sidebarBookshelf = document.getElementById('sidebarBookshelf');
        if (!sidebarBookshelf) return;

        const booksToRender = books || this.library.books;

        if (booksToRender.length === 0) {
            sidebarBookshelf.innerHTML = '<p>No books in your library.</p>';
            return;
        }

        sidebarBookshelf.innerHTML = booksToRender.map(book => `
            <div class="book-card ${book.status}">
                <img src="${book.coverUrl}" alt="${book.title}" class="book-cover">
                <div class="book-info">
                    <h3>${book.title}</h3>
                    <p>By ${book.author}</p>
                    <p>Genre: ${book.genre}</p>
                    <div class="progress-container">
                        <label>Reading Progress:</label>
                        <input type="range" 
                               class="progress-bar" 
                               value="${book.progress}" 
                               min="0" 
                               max="100"
                               onchange="window.app.updateProgress(${book.id}, this.value)">
                        <span>${book.progress}%</span>
                    </div>
                </div>
            </div>
        `).join('');
    }
}

function toggleBookshelf() {
    const sidebar = document.getElementById('bookshelfSidebar');
    sidebar.classList.toggle('open');
}

document.addEventListener('DOMContentLoaded', () => {
    const library = new LibraryManager();
    const ui = new UIManager(library);

    window.app = {
        addBookToLibrary: (book) => {
            const addedBook = library.addBook(book);
            if (addedBook) {
                ui.renderLibrary();
            } else {
                alert('This book is already in your library!');
            }
        },
        updateProgress: (bookId, progress) => {
            const book = library.books.find(b => b.id === bookId);
            if (book) {
                book.progress = parseInt(progress);
                book.status = progress == 100 ? 'completed' : 'reading';
                library.saveToLocalStorage();
                ui.renderLibrary();
            }
        }
    };

    // Initial library render
    ui.renderLibrary();
});