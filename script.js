class LibraryManager {
    constructor() {
        let storedLibrary = localStorage.getItem('library');
        if (storedLibrary) {
            this.books = JSON.parse(storedLibrary);
        } else {
            this.books = [];
        }
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

            return data.items.map(item => {
                let title = 'Untitled';
                if (item.volumeInfo.title) {
                    title = item.volumeInfo.title;
                }

                let author = 'Unknown Author';
                if (item.volumeInfo.authors) {
                    author = item.volumeInfo.authors[0];
                }

                let bookGenre = 'Uncategorized';
                if (item.volumeInfo.categories) {
                    bookGenre = item.volumeInfo.categories[0];
                } else if (genre) {
                    bookGenre = genre;
                }

                let coverUrl = 'https://via.placeholder.com/128x192?text=No+Cover';
                if (item.volumeInfo.imageLinks) {
                    coverUrl = item.volumeInfo.imageLinks.thumbnail;
                }

                return {
                    googleId: item.id,
                    title: title,
                    author: author,
                    genre: bookGenre,
                    coverUrl: coverUrl
                };
            });
        } catch (error) {
            console.error('Error searching books:', error);
            return [];
        }
    }

    getBooksByGenre(genre, showOnlyLiked = false) {
        let filteredBooks = this.books;
        
        if (showOnlyLiked) {
            filteredBooks = filteredBooks.filter(book => book.isLiked);
        }
        
        if (genre) {
            filteredBooks = filteredBooks.filter(book => book.genre === genre);
        }
        
        return filteredBooks;
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
                isLiked: false,
                googleId: book.googleId,
                coverUrl: book.coverUrl
            };
            this.books.push(newBook);
            this.saveToLocalStorage();
            return newBook;
        }
        return null;
    }

    toggleLike(bookId) {
        const book = this.books.find(b => b.id === bookId);
        if (book) {
            book.isLiked = !book.isLiked;
            this.saveToLocalStorage();
            return book.isLiked;
        }
        return false;
    }

    saveToLocalStorage() {
        localStorage.setItem('library', JSON.stringify(this.books));
    }
}

class UIManager {
    constructor(libraryManager) {
        this.library = libraryManager;
        this.showOnlyLiked = false;
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

        const showLikedOnly = document.getElementById('showLikedOnly');
        if (showLikedOnly) {
            showLikedOnly.addEventListener('change', () => {
                this.showOnlyLiked = showLikedOnly.checked;
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
        let selectedGenre = '';
        if (genreSelect) {
            selectedGenre = genreSelect.value;
        }

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
                <div class="book-card-low">
                <div>
                    <h3>${book.title}</h3>
                    <p>By ${book.author}</p>
                    <p>Genre: ${book.genre}</p>
                </div>
                <div>
                    <div class="newBtn">
                    <button onclick="app.addBookToLibrary(${JSON.stringify(book).replace(/"/g, '&quot;')})">
                        Add to Library
                    </button>
                    </div>
                </div>
                </div>
                </div>
            </div>
        `).join('');
    }

    filterLibrary() {
        const genreSelect = document.getElementById('libraryGenre');
        let selectedGenre = '';
        if (genreSelect) {
            selectedGenre = genreSelect.value;
        }
        const filteredBooks = this.library.getBooksByGenre(selectedGenre, this.showOnlyLiked);
        this.renderLibrary(filteredBooks);
    }

    renderLibrary(books = null) {
        const sidebarBookshelf = document.getElementById('sidebarBookshelf');
        if (!sidebarBookshelf) return;

        let booksToRender;
        if (books) {
            booksToRender = books;
        } else {
            booksToRender = this.library.books;
        }

        if (booksToRender.length === 0) {
            sidebarBookshelf.innerHTML = '<p>No books in your library.</p>';
            return;
        }

        sidebarBookshelf.innerHTML = booksToRender.map(book => `
            <div class="book-card">
                <img src="${book.coverUrl}" alt="${book.title}" class="book-cover">
                <div class="book-info">
                    <h3>${book.title}</h3>
                    <p>By ${book.author}</p>
                    <p>Genre: ${book.genre}</p>
                    <button 
                        class="like-button ${book.isLiked ? 'liked' : ''}"
                        onclick="app.toggleLike(${book.id})">
                        ${book.isLiked ? '❤️ Liked' : '🤍 Like'}
                    </button>
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
        toggleLike: (bookId) => {
            library.toggleLike(bookId);
            ui.filterLibrary();
        }
    };

    ui.renderLibrary();
});