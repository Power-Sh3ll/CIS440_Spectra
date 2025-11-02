// Tab switching
const loginTab = document.getElementById('login-tab');
const createAccountTab = document.getElementById('create-account-tab');
const logonForm = document.getElementById('logon-form');
const createAccountForm = document.getElementById('create-account-form');
const messageEl = document.getElementById('message');

loginTab.addEventListener('click', () => {
    logonForm.classList.add('active-form');
    createAccountForm.classList.remove('active-form');
    loginTab.classList.add('active');
    createAccountTab.classList.remove('active');
});

createAccountTab.addEventListener('click', () => {
    createAccountForm.classList.add('active-form');
    logonForm.classList.remove('active-form');
    createAccountTab.classList.add('active');
    loginTab.classList.remove('active');
});

// Logon form submission
logonForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;

  try {
    const response = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const result = await response.json();

    if (response.ok) {
      // ✅ Add these 3 lines inside the if block:
      localStorage.setItem('jwtToken', result.token);
      localStorage.setItem('token', result.token);   // <-- ensures footprint.js finds it
      window.location.href = '/profile';             // <-- keep this as it is

    } else {
      messageEl.textContent = result.message;
      messageEl.classList.add('error');
    }

  } catch (error) {
    console.error('Error:', error);
    messageEl.textContent = 'An error occurred. Please try again later.';
    messageEl.classList.add('error');
  }
});



// Create account form submission
createAccountForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const email = document.getElementById('create-email').value;
    const password = document.getElementById('create-password').value;
    const firstName = document.getElementById('create-first-name').value;
    const lastName = document.getElementById('create-last-name').value;
    const dateOfBirth = document.getElementById('create-date-of-birth').value;
    try {
        const response = await fetch('/api/create-account', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, firstName, lastName, dateOfBirth }),
        });

        const result = await response.json();
        if (response.ok) {
            messageEl.textContent = 'Account created successfully! You can now log in.';
            messageEl.classList.add('success');
            document.getElementById('login-email').value = email;
            document.getElementById('login-password').value = password;
            logonForm.classList.add('active-form');
            createAccountForm.classList.remove('active-form');
            loginTab.classList.add('active');
            createAccountTab.classList.remove('active');
        } else {
            messageEl.textContent = result.message;
            messageEl.classList.add('error');
        }
    } catch (error) {
        console.error('Error:', error);
        messageEl.textContent = 'An error occurred. Please try again later.';
        messageEl.classList.add('error');
    }
});