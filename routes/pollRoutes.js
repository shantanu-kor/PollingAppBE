const { Router } = require('express');
const pollsController = require('../controllers/polls');
const authMiddleware = require('../middlewares/auth');

const router = Router();

router.post('/new-poll', authMiddleware.authenticate, pollsController.newPoll);
router.get('/get-polls', authMiddleware.authenticate, pollsController.getPolls);
router.get('/user-polls', authMiddleware.authenticate, pollsController.getUserPolls);
router.post('/vote-poll/:id', authMiddleware.authenticate, pollsController.votePoll);
router.post('/comment-poll/:id', authMiddleware.authenticate, pollsController.commentPoll);
router.post('/comment-comment/:id', authMiddleware.authenticate, pollsController.commentComment);

module.exports = router;