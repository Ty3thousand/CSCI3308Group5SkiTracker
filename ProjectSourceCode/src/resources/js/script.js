
// Register password validation function
function check() {
    var input = document.getElementById('password_confirm');
    if (input.value != document.getElementById('password').value) {
        input.setCustomValidity('Password Must be Matching.');
    } else {
        // input is valid -- reset the error message
        input.setCustomValidity('');
    }
}


//Logout button pop up
const logoutButton = document.getElementById('logoutButton');

logoutButton.addEventListener('click', () => {
    const isConfirmed = confirm('Are you sure you want to logout?');

    if (isConfirmed) {
        window.location.href = '/login';
        alert('Logged out successfully!'); 
    }
});
