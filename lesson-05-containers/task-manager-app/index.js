const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// In-memory task storage
let tasks = [
  { id: 1, title: 'Learn Docker', completed: false },
  { id: 2, title: 'Deploy to ECS', completed: false }
];
let nextId = 3;

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', version: '2.0.0', timestamp: new Date().toISOString() });
});

// Get all tasks
app.get('/tasks', (req, res) => {
  res.json(tasks);
});

// Get single task
app.get('/tasks/:id', (req, res) => {
  const task = tasks.find(t => t.id === parseInt(req.params.id));
  if (!task) return res.status(404).json({ error: 'Task not found' });
  res.json(task);
});

// Create task
app.post('/tasks', (req, res) => {
  const { title } = req.body;
  if (!title) return res.status(400).json({ error: 'Title required' });

  const task = {
    id: nextId++,
    title,
    completed: false
  };
  tasks.push(task);
  res.status(201).json(task);
});

// Update task
app.put('/tasks/:id', (req, res) => {
  const task = tasks.find(t => t.id === parseInt(req.params.id));
  if (!task) return res.status(404).json({ error: 'Task not found' });

  if (req.body.title !== undefined) task.title = req.body.title;
  if (req.body.completed !== undefined) task.completed = req.body.completed;

  res.json(task);
});

// Delete task
app.delete('/tasks/:id', (req, res) => {
  const index = tasks.findIndex(t => t.id === parseInt(req.params.id));
  if (index === -1) return res.status(404).json({ error: 'Task not found' });

  tasks.splice(index, 1);
  res.status(204).send();
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Task Manager API running on port ${PORT}`);
});
