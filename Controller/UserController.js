const db = require("../config/database");


exports.UpdateProfile = async (req, res) => {
    const userId = req.accountID;  
    const { name, surname, phone } = req.body;

    if (!name || !surname || !phone) {
        return res.status(400).json({ success: false, message: 'All fields (name, surname, phone) are required.' });
    }

    try {
        const updateQuery = `
            UPDATE user 
            SET name = ?, surname = ?, phone = ?, updatedAt = NOW()
            WHERE id = ?
        `;
        const result = await db.mysqlQuery(updateQuery, [name, surname, phone, userId]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }

        return res.status(200).json({ success: true, message: 'Profile updated successfully.' });

    } catch (error) {
        console.error('Update Profile error:', error.message);
        return res.status(500).json({ success: false, message: 'Internal server error.' });
    }
};


