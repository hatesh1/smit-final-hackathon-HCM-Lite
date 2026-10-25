const router = require('express').Router();
const auth = require('../middleware/auth');
const rbac = require('../middleware/rbac');
const aiService = require('../services/ai.service');

router.use(auth);

// Ask the Assistant (All roles, server-enforced data scope)
router.post('/chat', async (req, res, next) => {
  try {
    const { prompt, messages } = req.body;
    if (!prompt) return res.status(400).json({ message: 'Prompt is required' });

    const result = await aiService.chat({
      prompt,
      messages,
      requestingUser: req.user,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// Summarize Dashboard (Admin and HR)
router.post('/summarize-dashboard', rbac('admin', 'hr'), async (req, res, next) => {
  try {
    const { kpis } = req.body;
    if (!kpis) return res.status(400).json({ message: 'KPI data is required' });

    const bullets = await aiService.summarizeDashboard(kpis, req.user.role);
    res.json({ bullets, isAiGenerated: true });
  } catch (err) {
    next(err);
  }
});

// Smart Leave: natural language to pre-filled JSON form (Employee and HR)
router.post('/smart-leave', async (req, res, next) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ message: 'Leave description text is required' });

    const parsed = await aiService.parseSmartLeave(text);
    res.json({ form: parsed, isAiGenerated: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
