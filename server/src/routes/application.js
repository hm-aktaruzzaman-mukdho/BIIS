const express = require('express');
const multer = require('multer');
const path = require('path');
const pool = require('../db');

const { analyzeApplication } = require('../services/ai');

const router = express.Router();

module.exports = router;