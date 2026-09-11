const PROFILE_API = 'profile_api.php';

/* =========================
   LOAD PROFILE FROM DB
========================== */

async function loadProfile() {
    try {
        const res = await fetch(PROFILE_API);
        const data = await res.json();
        if (!data.success) throw new Error(data.error);

        const p = data.profile;

        // Fill form fields
        document.getElementById('firstName').value = p.first_name || '';
        document.getElementById('lastName').value = p.last_name || '';
        document.getElementById('email').value = p.email || '';
        document.getElementById('phone').value = p.phone_num || '';

        // Update header display
        document.getElementById('displayName').textContent = (p.first_name || '') + ' ' + (p.last_name || '');
        document.getElementById('displayEmail').textContent = p.email || '';

        // Update badge
        const badge = document.querySelector('.MemberBadge');
        if (badge) badge.textContent = p.role ? p.role.charAt(0).toUpperCase() + p.role.slice(1) : 'Customer';
        if (p.profile_photo_url) {
            document.getElementById('profilePicture').src = p.profile_photo_url;
        }

    } catch (err) {
        console.error('Failed to load profile:', err);
    }
}

/* =========================
   EDIT PROFILE
========================== */

const editButton = document.getElementById('editButton');
const saveButton = document.getElementById('saveButton');
const profileInputs = document.querySelectorAll('#profileForm input');

editButton.addEventListener('click', function() {
    profileInputs.forEach(function(input) {
        input.disabled = false;
    });
    editButton.style.display = 'none';
    saveButton.disabled = false;
});

/* =========================
   SAVE PROFILE
========================== */

document.getElementById('profileForm').addEventListener('submit', async function(event) {
    event.preventDefault();

    const firstName = document.getElementById('firstName').value.trim();
    const lastName = document.getElementById('lastName').value.trim();
    const email = document.getElementById('email').value.trim();
    const phone = document.getElementById('phone').value.trim();

    if (!firstName || !lastName || !email) {
        alert('First name, last name, and email are required.');
        return;
    }

    try {
        const res = await fetch(PROFILE_API, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'update_info',
                first_name: firstName,
                last_name: lastName,
                email: email,
                phone: phone
            })
        });
        const data = await res.json();

        if (data.success) {
            // Update header
            document.getElementById('displayName').textContent = firstName + ' ' + lastName;
            document.getElementById('displayEmail').textContent = email;

            // Disable inputs
            profileInputs.forEach(function(input) { input.disabled = true; });
            saveButton.disabled = true;
            editButton.style.display = 'inline-block';

            alert('Your information has been updated!');
        } else {
            alert(data.error);
        }
    } catch (err) {
        alert('Error saving profile. Please try again.');
    }
});

/* =========================
   PASSWORD VISIBILITY
========================== */

function togglePassword(inputId, button) {
    const input = document.getElementById(inputId);
    if (input.type === 'password') {
        input.type = 'text';
        button.textContent = '🙈';
    } else {
        input.type = 'password';
        button.textContent = '👁';
    }
}

/* =========================
   CHANGE PASSWORD
========================== */

document.getElementById('passwordForm').addEventListener('submit', async function(event) {
    event.preventDefault();

    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    if (!currentPassword) { alert('Please enter your current password.'); return; }
    if (!newPassword) { alert('Please enter a new password.'); return; }
    if (newPassword.length < 8) { alert('New password must be at least 8 characters.'); return; }
    if (newPassword !== confirmPassword) { alert('Passwords do not match.'); return; }

    try {
        const res = await fetch(PROFILE_API, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'change_password',
                current_password: currentPassword,
                new_password: newPassword
            })
        });
        const data = await res.json();

        if (data.success) {
            alert('Your password has been changed!');
            document.getElementById('passwordForm').reset();
        } else {
            alert(data.error);
        }
    } catch (err) {
        alert('Error changing password. Please try again.');
    }
});

/* =========================
   PROFILE PHOTO
========================== */

document.getElementById('photoInput').addEventListener('change', async function(event) {
    const file = event.target.files[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) {
        alert('Select a valid JPG, PNG, or WebP image up to 5 MB.');
        event.target.value = '';
        return;
    }

    const picture = document.getElementById('profilePicture');
    const changeButton = document.querySelector('.ChangePhoto');
    const previousSource = picture.src;
    const previewUrl = URL.createObjectURL(file);
    picture.src = previewUrl;
    changeButton.disabled = true;
    changeButton.textContent = 'Uploading...';

    try {
        const formData = new FormData();
        formData.append('action', 'upload_photo');
        formData.append('photo', file);
        const response = await fetch(PROFILE_API, {method: 'POST', body: formData});
        const data = await response.json();
        if (!response.ok || !data.success) throw new Error(data.error || 'Unable to upload profile photo.');
        picture.src = data.photo_url;
        alert('Profile photo updated successfully!');
    } catch (error) {
        picture.src = previousSource;
        alert(error.message || 'Unable to upload profile photo.');
    } finally {
        URL.revokeObjectURL(previewUrl);
        changeButton.disabled = false;
        changeButton.textContent = 'Change Photo';
        event.target.value = '';
    }
});

/* =========================
   LOGOUT
========================== */

document.getElementById('logoutButton').addEventListener('click', function() {
    if (confirm('Are you sure you want to logout?')) {
        window.location.href = '../Registration/logout.php';
    }
});

/* =========================
   INIT
========================== */

loadProfile();
