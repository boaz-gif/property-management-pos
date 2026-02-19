
const TenantDashboardService = require('../services/tenantDashboardService');
const Tenant = require('../models/Tenant');

const getTenantId = async (req) => {
    if (req.user.tenant_id) return req.user.tenant_id;
    const tenant = await Tenant.findByUserId(req.user.id);
    if (tenant) return tenant.id;
    return null;
};

exports.getDashboard = async (req, res) => {
    try {
        const tenantId = await getTenantId(req);
        if (!tenantId) return res.status(404).json({ message: 'Tenant record not found' });
        
        const summary = await TenantDashboardService.getHomeSummary(tenantId);
        res.json(summary);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.getWidgets = async (req, res) => {
    try {
        const tenantId = await getTenantId(req);
        if (!tenantId) return res.status(404).json({ message: 'Tenant record not found' });

        const widgets = await TenantDashboardService.getWidgets(tenantId);
        res.json(widgets);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.updateWidgets = async (req, res) => {
    try {
        const tenantId = await getTenantId(req);
        if (!tenantId) return res.status(404).json({ message: 'Tenant record not found' });

        await TenantDashboardService.updateWidgetOrder(tenantId, req.body.widgets);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.getAnnouncements = async (req, res) => {
    try {
        const tenantId = await getTenantId(req);
        if (!tenantId) return res.status(404).json({ message: 'Tenant record not found' });
        
        // We also need propertyId. Usually accessible from tenant record.
        // Let's assume we fetch tenant to get propertyId
        const tenant = await Tenant.findById(tenantId, { role: 'tenant', id: req.user.id }); // Using existing model method which does auth check too
        
        const announcements = await TenantDashboardService.getAnnouncements(tenantId, tenant.property_id);
        res.json(announcements);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.markAnnouncementViewed = async (req, res) => {
    try {
        const tenantId = await getTenantId(req);
        if (!tenantId) return res.status(404).json({ message: 'Tenant record not found' });

        await TenantDashboardService.markAnnouncementViewed(tenantId, req.params.id);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.acknowledgeAnnouncement = async (req, res) => {
    try {
        const tenantId = await getTenantId(req);
        if (!tenantId) return res.status(404).json({ message: 'Tenant record not found' });

        await TenantDashboardService.acknowledgeAnnouncement(tenantId, req.params.id);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.markAnnouncementRead = async (req, res) => {
    return exports.acknowledgeAnnouncement(req, res);
};

exports.getNotifications = async (req, res) => {
    try {
        const tenantId = await getTenantId(req);
        if (!tenantId) return res.status(404).json({ message: 'Tenant record not found' });

        const notifications = await TenantDashboardService.getNotifications(tenantId, req.query.unread === 'true');
        res.json(notifications);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.markNotificationRead = async (req, res) => {
    try {
        const tenantId = await getTenantId(req);
        if (!tenantId) return res.status(404).json({ message: 'Tenant record not found' });

        await TenantDashboardService.markNotificationRead(tenantId, req.params.id);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.logQuickAction = async (req, res) => {
    try {
        const tenantId = await getTenantId(req);
        if (!tenantId) return res.status(404).json({ message: 'Tenant record not found' });

        await TenantDashboardService.logQuickAction(tenantId, req.body.action_type, req.body.execution_time_ms);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.getPreferences = async (req, res) => {
    try {
        const tenantId = await getTenantId(req);
        if (!tenantId) return res.status(404).json({ message: 'Tenant record not found' });
        
        const prefs = await TenantDashboardService.getPreferences(tenantId);
        res.json(prefs);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.updatePreferences = async (req, res) => {
    try {
        const tenantId = await getTenantId(req);
        if (!tenantId) return res.status(404).json({ message: 'Tenant record not found' });
        
        const prefs = await TenantDashboardService.updatePreferences(tenantId, req.body);
        res.json(prefs);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
