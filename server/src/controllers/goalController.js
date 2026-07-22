const goalService = require('../services/goalService');

async function list(req, res, next) {
  try {
    const items = await goalService.listGoals(req.user._id);
    res.json(items);
  } catch (err) {
    next(err);
  }
}

async function getOne(req, res, next) {
  try {
    const doc = await goalService.getGoal(req.user._id, req.params.id);
    if (!doc) {
      return res.status(404).json({ message: 'Goal not found' });
    }
    res.json(doc);
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const result = await goalService.createGoal(req.user._id, req.body);
    if (result.error) {
      return res.status(400).json({ message: result.error });
    }
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const result = await goalService.updateGoal(req.user._id, req.params.id, req.body);
    if (result.error === 'not_found') {
      return res.status(404).json({ message: 'Goal not found' });
    }
    if (result.error) {
      return res.status(400).json({ message: result.error });
    }
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    const doc = await goalService.deleteGoal(req.user._id, req.params.id);
    if (!doc) {
      return res.status(404).json({ message: 'Goal not found' });
    }
    res.json({ message: 'Goal removed', id: doc._id });
  } catch (err) {
    next(err);
  }
}

module.exports = { list, getOne, create, update, remove };
