import {
    auth,
    db,
    signOut,
    onAuthStateChanged,
    collection,
    addDoc,
    onSnapshot,
    query,
    where,
    orderBy,
    doc,
    updateDoc,
    deleteDoc,
    serverTimestamp
} from './firebase-config.js';

let currentUser = null;
let unsubscribeTasks = null;
const taskListContainer = document.getElementById('task-list');

// 1. Authentication Handlers
onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        const displayName = user.displayName || user.email.split('@')[0];
        const nameDisplay = document.querySelector('.user-info h4');
        const heroNameDisplay = document.querySelector('.content-header h1');

        if (nameDisplay) nameDisplay.textContent = displayName;
        if (heroNameDisplay) heroNameDisplay.innerHTML = `Good Morning, ${displayName}! 👋`;

        // Fetch User's Tasks
        fetchTasks(user.uid);
    } else {
        window.location.href = 'index.html'; // Redirect to login
    }
});

const logoutBtn = document.querySelector('.log-out');
if (logoutBtn) {
    logoutBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        try {
            if (unsubscribeTasks) unsubscribeTasks();
            await signOut(auth);
            window.location.href = 'index.html';
        } catch (error) {
            console.error('Error logging out:', error);
        }
    });
}

// 2. Database Handlers
const fetchTasks = (uid) => {
    const q = query(collection(db, 'tasks'), where("userId", "==", uid));

    // Setup real-time listener
    unsubscribeTasks = onSnapshot(q, (snapshot) => {
        taskListContainer.innerHTML = ''; // Clear container
        let taskCount = 0;
        let completedCount = 0;

        if (snapshot.empty) {
            taskListContainer.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-check-circle" style="font-size: 3rem; margin-bottom: 1rem; color: var(--text-tertiary);"></i>
                    <p>No tasks found. Create one to get started!</p>
                </div>
            `;
            updateStats(0, 0);
            return;
        }

        const tasks = [];
        snapshot.forEach((docSnap) => {
            tasks.push({ id: docSnap.id, ...docSnap.data() });
        });

        // Sort by createdAt descending client-side to avoid Firestore index requirement
        tasks.sort((a, b) => {
            const timeA = a.createdAt ? a.createdAt.toMillis() : 0;
            const timeB = b.createdAt ? b.createdAt.toMillis() : 0;
            return timeB - timeA;
        });

        tasks.forEach((task) => {
            taskCount++;
            if (task.completed) completedCount++;
            renderTask(task.id, task);
        });

        // Update stats UI
        updateStats(taskCount, completedCount);
    });
};

const updateStats = (total, completed) => {
    const inProgress = total - completed;
    const statValues = document.querySelectorAll('.stat-info h3');
    if (statValues.length >= 3) {
        statValues[0].textContent = total;
        statValues[1].textContent = inProgress;
        statValues[2].textContent = completed;
    }

    const percentage = total === 0 ? 0 : Math.round((completed / total) * 100);
    const progressText = document.querySelector('.progress-section span');
    const progressBar = document.querySelector('.progress-bar');

    if (progressText) progressText.textContent = `${percentage}%`;
    if (progressBar) progressBar.style.width = `${percentage}%`;
};

// Render Task Card
const renderTask = (taskId, task) => {
    const priorityClass = `priority-${task.priority.toLowerCase()}`;
    const completedClass = task.completed ? 'task-completed' : '';
    const dateFormatted = new Date(task.date + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

    const cardHTML = `
        <div class="task-card glass-card ${priorityClass} ${completedClass}" data-id="${taskId}">
            <div class="task-checkbox">
                <input type="checkbox" id="check-${taskId}" ${task.completed ? 'checked' : ''} onchange="toggleTaskStatus('${taskId}', this.checked)">
                <label for="check-${taskId}"></label>
            </div>
            <div class="task-details">
                <h4 class="task-title">${task.title}</h4>
                ${!task.completed && task.desc ? `<p class="task-desc">${task.desc}</p>` : ''}
                <div class="task-meta">
                    <span class="meta-item"><i class="far fa-calendar-alt"></i> ${dateFormatted} ${task.time ? task.time : ''}</span>
                    <span class="meta-item tag tag-${task.category.toLowerCase()}">${task.category}</span>
                    <span class="meta-item tag tag-${task.priority.toLowerCase()}">${task.priority} Priority</span>
                </div>
            </div>
            <div class="task-actions">
                <button class="btn btn-icon btn-text text-danger" onclick="deleteTaskAction('${taskId}')"><i class="far fa-trash-alt"></i></button>
            </div>
        </div>
    `;

    taskListContainer.insertAdjacentHTML('beforeend', cardHTML);
};

// UI Action Handlers (must be global to work with onclick attributes)
window.toggleTaskStatus = async (taskId, isChecked) => {
    try {
        const taskRef = doc(db, 'tasks', taskId);
        await updateDoc(taskRef, { completed: isChecked });
        showToast(isChecked ? 'Task marked as completed.' : 'Task un-completed', 'success');
    } catch (e) {
        showToast('Error updating task.', 'error');
    }
};

window.deleteTaskAction = async (taskId) => {
    try {
        await deleteDoc(doc(db, 'tasks', taskId));
        showToast('Task deleted successfully.', 'success');
    } catch (e) {
        showToast('Error deleting task.', 'error');
    }
};

// Add Task Form Submit
const newTaskForm = document.getElementById('new-task-form');
if (newTaskForm) {
    newTaskForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const title = document.getElementById('task-title-input').value;
        const desc = document.getElementById('task-desc-input').value;
        const date = document.getElementById('task-date-input').value;
        const time = document.getElementById('task-time-input').value;
        const category = document.getElementById('task-category-input').value;
        const priority = document.getElementById('task-priority-input').value;

        try {
            await addDoc(collection(db, 'tasks'), {
                userId: currentUser.uid,
                title,
                desc,
                date,
                time,
                category,
                priority,
                completed: false,
                createdAt: serverTimestamp()
            });

            window.toggleModal();
            showToast('Task successfully created!', 'success');
            newTaskForm.reset();
        } catch (error) {
            showToast('Error creating task: ' + error.message, 'error');
        }
    });
}


// ---------------------------------
// UI Interactivity (Modals, Toast, Menus)
// ---------------------------------
const mobileMenuBtn = document.getElementById('mobile-menu-toggle');
const mobileMenuCloseBtn = document.querySelector('.mobile-menu-close');
const sidebar = document.querySelector('.sidebar');

if (mobileMenuBtn && sidebar) {
    mobileMenuBtn.addEventListener('click', () => sidebar.classList.add('show'));
}

if (mobileMenuCloseBtn && sidebar) {
    mobileMenuCloseBtn.addEventListener('click', () => sidebar.classList.remove('show'));
}

const addTaskBtn = document.getElementById('add-task-btn');
const taskModal = document.getElementById('task-modal');
const closeModalBtn = document.getElementById('close-modal');
const cancelTaskBtn = document.getElementById('cancel-task');

window.toggleModal = () => taskModal.classList.toggle('active');

if (addTaskBtn) addTaskBtn.addEventListener('click', window.toggleModal);
if (closeModalBtn) closeModalBtn.addEventListener('click', window.toggleModal);
if (cancelTaskBtn) cancelTaskBtn.addEventListener('click', window.toggleModal);
taskModal.addEventListener('click', (e) => { if (e.target === taskModal) window.toggleModal(); });

const showToast = (message, type = 'success') => {
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    const icon = type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle';

    toast.innerHTML = `
        <i class="fas ${icon}" style="color: var(--${type}-color); font-size: 1.25rem;"></i>
        <div>
            <h5 style="margin-bottom: 0.25rem; font-size: 0.875rem;">${type.charAt(0).toUpperCase() + type.slice(1)}</h5>
            <p style="font-size: 0.75rem; color: var(--text-secondary);">${message}</p>
        </div>
    `;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s forwards ease-in';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
};

window.showToast = showToast;
