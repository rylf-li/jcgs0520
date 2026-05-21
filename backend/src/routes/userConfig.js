const express = require('express');
const router = express.Router();
const configService = require('../services/configService');
const auth = require('../middleware/auth');

router.use(auth);

router.get('/:formId', async (req, res) => {
  try {
    const { formId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        message: '未授权访问' 
      });
    }

    const result = await configService.getUserConfig(userId, formId);
    res.json({ 
      success: true, 
      data: result.config 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

router.post('/', async (req, res) => {
  try {
    const { formId, config } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        message: '未授权访问' 
      });
    }

    if (!formId || !config) {
      return res.status(400).json({ 
        success: false, 
        message: '缺少必要参数' 
      });
    }

    if (!configService.validateColumnWidths(config.columnWidths)) {
      return res.status(400).json({ 
        success: false, 
        message: '列宽配置格式无效' 
      });
    }

    if (!configService.validateSortConfig(config.sortConfig)) {
      return res.status(400).json({ 
        success: false, 
        message: '排序配置格式无效' 
      });
    }

    const result = await configService.saveUserConfig(userId, formId, config);
    res.json({ 
      success: true, 
      data: result.config 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

router.delete('/:formId', async (req, res) => {
  try {
    const { formId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        message: '未授权访问' 
      });
    }

    const result = await configService.resetToDefault(userId, formId);
    res.json({ 
      success: true, 
      data: result.config,
      message: '配置已重置为默认值'
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

router.post('/batch', async (req, res) => {
  try {
    const { formIds } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        message: '未授权访问' 
      });
    }

    if (!formIds || !Array.isArray(formIds) || formIds.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: '缺少表单ID列表' 
      });
    }

    const result = await configService.batchGetConfigs(userId, formIds);
    res.json({ 
      success: true, 
      data: result.configs 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

router.get('/default/:formId', async (req, res) => {
  try {
    const { formId } = req.params;
    const defaultConfig = configService.getDefaultConfig(formId);
    
    res.json({ 
      success: true, 
      data: defaultConfig 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

module.exports = router;
