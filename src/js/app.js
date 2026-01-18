// TODO: write code here

console.log('Trello-like Board app');

class BoardState {
    constructor() {
        this.columns = {
            todo: [],
            progress: [],
            done: []
        };
        this.nextCardId = 1;
        this.loadState();
    }

    saveState() {
        const state = {
            columns: this.columns,
            nextCardId: this.nextCardId
        };
        localStorage.setItem('trelloBoardState', JSON.stringify(state));
    }

    loadState() {
        const savedState = localStorage.getItem('trelloBoardState');
        if (savedState) {
            const state = JSON.parse(savedState);
            this.columns = state.columns;
            this.nextCardId = state.nextCardId || 1;
        }
    }

    addCard(columnId, text) {
        if (!text.trim()) return null;
        
        const card = {
            id: this.nextCardId++,
            text: text.trim(),
            column: columnId
        };
        
        this.columns[columnId].push(card);
        this.saveState();
        return card;
    }

    deleteCard(cardId) {
        for (const columnId in this.columns) {
            const index = this.columns[columnId].findIndex(card => card.id === cardId);
            if (index !== -1) {
                this.columns[columnId].splice(index, 1);
                this.saveState();
                return true;
            }
        }
        return false;
    }

    moveCard(cardId, targetColumnId, position = null) {
        let card = null;
        let sourceColumnId = null;
        
        for (const columnId in this.columns) {
            const index = this.columns[columnId].findIndex(c => c.id === cardId);
            if (index !== -1) {
                card = this.columns[columnId][index];
                sourceColumnId = columnId;
                break;
            }
        }
        
        if (!card || sourceColumnId === targetColumnId) return false;
        
        this.columns[sourceColumnId] = this.columns[sourceColumnId].filter(c => c.id !== cardId);
        
        this.columns[targetColumnId].push(card);
        card.column = targetColumnId;
        
        this.saveState();
        return true;
    }

    getCard(cardId) {
        for (const columnId in this.columns) {
            const card = this.columns[columnId].find(c => c.id === cardId);
            if (card) return card;
        }
        return null;
    }
}

class DOMManager {
    constructor(boardState) {
        this.boardState = boardState;
        this.cardTemplate = document.getElementById('card-template');
        this.draggedCard = null;
        this.init();
    }

    init() {
        this.render();
        this.setupEventListeners();
    }

    render() {
        for (const columnId in this.boardState.columns) {
            const container = document.querySelector(`[data-cards-container="${columnId}"]`);
            container.innerHTML = '';
            
            this.boardState.columns[columnId].forEach(card => {
                const cardElement = this.createCardElement(card);
                container.appendChild(cardElement);
            });
            
            const countElement = document.querySelector(`[data-column-id="${columnId}"] .card-count`);
            countElement.textContent = this.boardState.columns[columnId].length;
        }
    }

    createCardElement(card) {
        const cardElement = this.cardTemplate.content.cloneNode(true).querySelector('.card');
        cardElement.setAttribute('data-card-id', card.id);
        cardElement.setAttribute('data-column-id', card.column);
        
        const textElement = cardElement.querySelector('.card-text');
        textElement.textContent = card.text;
        
        const deleteBtn = cardElement.querySelector('.delete-card-btn');
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.deleteCard(card.id);
        });
        
        cardElement.addEventListener('dragstart', this.handleDragStart.bind(this));
        cardElement.addEventListener('dragend', this.handleDragEnd.bind(this));
        
        return cardElement;
    }

    setupEventListeners() {
        document.querySelectorAll('.add-card-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const columnId = e.target.closest('.add-card-btn').dataset.column;
                this.showAddCardPrompt(columnId);
            });
        });
        
        document.querySelectorAll('.cards-container').forEach(container => {
            container.addEventListener('dragover', this.handleDragOver.bind(this));
            container.addEventListener('dragenter', this.handleDragEnter.bind(this));
            container.addEventListener('dragleave', this.handleDragLeave.bind(this));
            container.addEventListener('drop', this.handleDrop.bind(this));
        });
    }

    showAddCardPrompt(columnId) {
        const text = prompt('Enter card text:');
        if (text !== null) {
            const card = this.boardState.addCard(columnId, text);
            if (card) {
                this.render();
            }
        }
    }

    deleteCard(cardId) {
        if (this.boardState.deleteCard(cardId)) {
            this.render();
        }
    }

    handleDragStart(e) {
        this.draggedCard = e.target.closest('.card');
        e.dataTransfer.setData('text/plain', this.draggedCard.dataset.cardId);
        e.dataTransfer.effectAllowed = 'move';
        
        setTimeout(() => {
            this.draggedCard.classList.add('dragging');
        }, 0);
    }

    handleDragEnd() {
        if (this.draggedCard) {
            this.draggedCard.classList.remove('dragging');
            this.draggedCard = null;
        }
        
        document.querySelectorAll('.cards-container').forEach(container => {
            container.classList.remove('drag-over');
        });
    }

    handleDragOver(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    }

    handleDragEnter(e) {
        e.preventDefault();
        const container = e.target.closest('.cards-container');
        if (container) {
            container.classList.add('drag-over');
        }
    }

    handleDragLeave(e) {
        const container = e.target.closest('.cards-container');
        if (container && !container.contains(e.relatedTarget)) {
            container.classList.remove('drag-over');
        }
    }

    handleDrop(e) {
        e.preventDefault();
        const container = e.target.closest('.cards-container');
        if (!container) return;
        
        container.classList.remove('drag-over');
        
        const cardId = parseInt(e.dataTransfer.getData('text/plain'));
        const targetColumnId = container.dataset.cardsContainer;
        
        if (this.boardState.moveCard(cardId, targetColumnId)) {
            this.render();
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const boardState = new BoardState();
    new DOMManager(boardState);
});