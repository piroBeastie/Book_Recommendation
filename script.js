class LibraryManager {
    constructor() {
        this.books = JSON.parse(localStorage.getItem('library')) || [];
        this.googleBooksAPI = 'https://www.googleapis.com/books/v1/volumes';
    }

    // Add a book to the library
    addBook(book) {
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

    // Update reading progress
    updateProgress(bookId, progress) {
        const book = this.books.find(b => b.id === bookId);
        if (book) {
            book.progress = Math.min(100, Math.max(0, progress));
            book.status = progress === 100 ? 'completed' : 'reading';
            this.saveToLocalStorage();
        }
    }

    // Save to localStorage
    saveToLocalStorage() {
        localStorage.setItem('library', JSON.stringify(this.books));
    }

    async searchBooks(query) {
        try {
            const response = await fetch(
                `${this.googleBooksAPI}?q=${encodeURIComponent(query)}&maxResults=10`
            );
            const data = await response.json();
            return data.items.map(item => ({
                googleId: item.id,
                title: item.volumeInfo.title,
                author: item.volumeInfo.authors?.[0] || 'Unknown',
                genre: item.volumeInfo.categories?.[0] || 'Uncategorized',
                coverUrl: item.volumeInfo.imageLinks?.thumbnail || 'placeholder.jpg'
            }));
        } catch (error) {
            console.error('Error searching books:', error);
            return [];
        }
    }

    // Get book recommendations based on genre
    getRecommendations(genre) {
        return this.books
            .filter(book => book.genre === genre && book.status === 'completed')
            .sort((a, b) => b.progress - a.progress);
    }
}

// UI Manager Class
class UIManager {
    constructor(libraryManager) {
        this.library = libraryManager;
        this.initializeUI();
    }

    initializeUI() {
        const searchForm = document.getElementById('searchForm');
        searchForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const query = document.getElementById('searchInput').value;
            const results = await this.library.searchBooks(query);
            this.displaySearchResults(results);
        });

        document.getElementById('bookshelf').addEventListener('change', (e) => {
            if (e.target.classList.contains('progress-input')) {
                const bookId = parseInt(e.target.dataset.bookId);
                const progress = parseInt(e.target.value);
                this.library.updateProgress(bookId, progress);
                this.renderLibrary();
            }
        });

        this.renderLibrary();
    }

    displaySearchResults(books) {
        const resultsContainer = document.getElementById('searchResults');
        resultsContainer.innerHTML = books.map(book => `
            <div class="book-card">
                <img src="${book.coverUrl}" alt="${book.title}" class="book-cover">
                <h3>${book.title}</h3>
                <p>By ${book.author}</p>
                <p>Genre: ${book.genre}</p>
                <button onclick="app.addBookToLibrary(${JSON.stringify(book).replace(/"/g, '&quot;')})">
                    Add to Library
                </button>
            </div>
        `).join('');
    }

    renderLibrary() {
        const bookshelf = document.getElementById('bookshelf');
        bookshelf.innerHTML = this.library.books.map(book => `
            <div class="book-card ${book.status}">
                <img src="${book.coverUrl}" alt="${book.title}" class="book-cover">
                <h3>${book.title}</h3>
                <p>By ${book.author}</p>
                <p>Genre: ${book.genre}</p>
                <div class="progress-container">
                    <input type="range" 
                           class="progress-input" 
                           data-book-id="${book.id}"
                           value="${book.progress}" 
                           min="0" 
                           max="100">
                    <span>${book.progress}%</span>
                </div>
            </div>
        `).join('');
    }
}