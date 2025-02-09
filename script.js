class LibraryManager {
    constructor() {
        let storedLibrary = localStorage.getItem('library');
        if (storedLibrary) {
            this.books = JSON.parse(storedLibrary);
        } else {
            this.books = [];
        }
        this.googleBooksAPI = 'https://www.googleapis.com/books/v1/volumes';
        this.nyTimesAPI = 'https://api.nytimes.com/svc/books/v3';
        this.nyTimesKey = 'WjB7n0D6APvlNGRH57nwXnAim4dJN0ju'; 
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
                const volumeInfo = item.volumeInfo;
                
                return {
                    googleId: item.id,
                    title: volumeInfo.title || 'Untitled',
                    author: volumeInfo.authors ? volumeInfo.authors[0] : 'Unknown Author',
                    genre: volumeInfo.categories ? volumeInfo.categories[0] : 'Uncategorized',
                    coverUrl: volumeInfo.imageLinks ? volumeInfo.imageLinks.thumbnail : 'https://via.placeholder.com/128x192?text=No+Cover',
                    description: volumeInfo.description || 'No description available',
                    pageCount: volumeInfo.pageCount || 'Unknown',
                    publishedDate: volumeInfo.publishedDate || 'Unknown',
                    averageRating: volumeInfo.averageRating || 0,
                    ratingsCount: volumeInfo.ratingsCount || 0,
                    previewLink: volumeInfo.previewLink || null
                };
            });
        } catch (error) {
            console.error('Error searching books:', error);
            return [];
        }
    }

    async getBestSellers() {
        try {
            const response = await fetch(
                `${this.nyTimesAPI}/lists/current/hardcover-fiction.json?api-key=${this.nyTimesKey}`
            );
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            return data.results.books;
        } catch (error) {
            console.error('Error fetching bestsellers:', error);
            return [];
        }
    }

    async getBookReviews(isbn) {
        try {
            const response = await fetch(
                `${this.nyTimesAPI}/reviews.json?isbn=${isbn}&api-key=${this.nyTimesKey}`
            );
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            return data.results;
        } catch (error) {
            console.error('Error fetching reviews:', error);
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
                isLiked: false,
                googleId: book.googleId,
                coverUrl: book.coverUrl,
                description: book.description,
                pageCount: book.pageCount,
                publishedDate: book.publishedDate,
                averageRating: book.averageRating,
                ratingsCount: book.ratingsCount,
                previewLink: book.previewLink,
                notes: '',
                dateAdded: new Date().toISOString()
            };
            this.books.push(newBook);
            this.saveToLocalStorage();
            return newBook;
        }
        return null;
    }

    toggleLike(bookId) {
        bookId = parseInt(bookId, 10);
        const book = this.books.find(b => b.id === bookId);
        
        if (book) {
            book.isLiked = !book.isLiked;
            this.saveToLocalStorage();
            return book.isLiked;
        }
        return false;
    }

    getBooksByGenre(genre, showOnlyLiked = false) {
        let filteredBooks = [...this.books]; 
        
        if (showOnlyLiked) {
            filteredBooks = filteredBooks.filter(book => book.isLiked);
        }
        
        if (genre) {
            filteredBooks = filteredBooks.filter(book => book.genre === genre);
        }
        
        return filteredBooks;
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
        this.loadBestSellers();
    }

    initializeEventListeners() {
        const searchForm = document.getElementById('searchForm');
        if (searchForm) {
            searchForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.handleSearch();
            });
        }

        const showLikedOnly = document.getElementById('showLikedOnly');
        if (showLikedOnly) {
            showLikedOnly.addEventListener('change', () => {
                this.showOnlyLiked = showLikedOnly.checked;
                this.filterLibrary();
            });
        }

        // Add event listener for like buttons
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('like-button')) {
                const bookId = e.target.getAttribute('data-book-id');
                const isLiked = this.library.toggleLike(bookId);
                this.updateLikeButton(e.target, isLiked);
            }
        });
    }

    updateLikeButton(button, isLiked) {
        button.classList.toggle('liked', isLiked);
        button.innerHTML = isLiked ? '❤️ Liked' : '🤍 Like';
    }

    async loadBestSellers() {
        const bestsellers = await this.library.getBestSellers();
        this.displayBestSellers(bestsellers);
    }

    displayBestSellers(books) {
        const container = document.createElement('div');
        container.className = 'bestsellers-section';
        container.innerHTML = `
            <h2>NYT Bestsellers</h2>
            <div class="bestsellers-grid">
                ${books.map(book => `
                    <div class="book-card bestseller">
                        <img src="${book.book_image}" alt="${book.title}" class="book-cover">
                        <div class="book-info">
                            <h3>${book.title}</h3>
                            <p>By ${book.author}</p>
                            <p class="rank">#${book.rank} on NYT Bestsellers</p>
                            <p class="weeks">Weeks on list: ${book.weeks_on_list}</p>
                            <a href="${book.amazon_product_url}" target="_blank" class="buy-button">Buy on Amazon</a>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
        
        const searchSection = document.querySelector('.search-section');
        searchSection.parentNode.insertBefore(container, searchSection.nextSibling);
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
                            ${book.averageRating ? `
                                <p class="rating">
                                    Rating: ${book.averageRating}/5 (${book.ratingsCount} ratings)
                                </p>
                            ` : ''}
                            <p class="published-date">Published: ${book.publishedDate}</p>
                            <p class="page-count">Pages: ${book.pageCount}</p>
                            <div class="description-preview">
                                ${book.description.substring(0, 60)}...
                            </div>
                        </div>
                        <div>
                            ${book.previewLink ? `
                                <a href="${book.previewLink}" target="_blank" class="preview-button">
                                    Preview Book
                                </a>
                            ` : ''}
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
        const filteredBooks = this.library.getBooksByGenre('', this.showOnlyLiked);
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
            <div class="book-card" data-book-id="${book.id}">
                <img src="${book.coverUrl}" alt="${book.title}" class="book-cover">
                <div class="book-info">
                    <h3>${book.title}</h3>
                    <p>By ${book.author}</p>
                    <p>Genre: ${book.genre}</p>
                    ${book.averageRating ? `
                        <p class="rating">
                            Rating: ${book.averageRating}/5 (${book.ratingsCount} ratings)
                        </p>
                    ` : ''}
                    <p class="published-date">Published: ${book.publishedDate}</p>
                    <p class="page-count">Pages: ${book.pageCount}</p>
                    <button 
                        class="like-button ${book.isLiked ? 'liked' : ''}"
                        data-book-id="${book.id}">
                        ${book.isLiked ? '❤️ Liked' : '🤍 Like'}
                    </button>
                    ${book.previewLink ? `
                        <a href="${book.previewLink}" target="_blank" class="preview-button">
                            Preview Book
                        </a>
                    ` : ''}
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
        }
    };

    ui.renderLibrary();
});