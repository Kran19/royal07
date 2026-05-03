const Auth = {
    init() {
        this.bindEvents();
        this.checkSession();
    },

    bindEvents() {
        const sendOtpBtn = document.getElementById('send-otp-btn');
        const verifyOtpBtn = document.getElementById('verify-otp-btn');
        const mobileInput = document.getElementById('mobile-input');
        const otpInputs = document.querySelectorAll('.otp-input');
        const backBtn = document.getElementById('back-to-mobile');

        // Step 1: Send OTP
        sendOtpBtn.addEventListener('click', () => {
            const mobile = mobileInput.value;
            if (mobile.length >= 10) {
                this.sendOtp(mobile);
            } else {
                alert('Please enter a valid mobile number');
            }
        });

        // Step 2: Verify OTP
        verifyOtpBtn.addEventListener('click', () => {
            const otp = Array.from(otpInputs).map(input => input.value).join('');
            if (otp.length === 4) {
                this.verifyOtp(otp);
            } else {
                alert('Please enter the 4-digit OTP');
            }
        });

        // OTP Input Auto-focus
        otpInputs.forEach((input, index) => {
            input.addEventListener('input', (e) => {
                if (e.target.value && index < otpInputs.length - 1) {
                    otpInputs[index + 1].focus();
                }
            });
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Backspace' && !e.target.value && index > 0) {
                    otpInputs[index - 1].focus();
                }
            });
        });

        // Back Button
        backBtn.addEventListener('click', () => {
            document.getElementById('auth-step-2').classList.add('hidden');
            document.getElementById('auth-step-1').classList.remove('hidden');
        });
    },

    checkSession() {
        const storedUser = localStorage.getItem('elevator_user');
        if (storedUser) {
            State.user = JSON.parse(storedUser);
            this.loginSuccess();
        }
    },

    sendOtp(mobile) {
        // Mock API Call
        console.log(`Sending OTP to ${mobile}...`);

        State.user.mobile = mobile;

        // UI Transition
        document.getElementById('auth-step-1').classList.add('hidden');
        document.getElementById('auth-step-2').classList.remove('hidden');
        document.getElementById('display-mobile').textContent = mobile;

        // Auto-focus first digit
        document.querySelector('.otp-input').focus();
    },

    verifyOtp(otp) {
        // Mock Verification (Accept any 4 digit OTP for demo)
        if (otp === '1234' || otp.length === 4) {
            State.user.isLoggedIn = true;
            State.user.username = `User${Math.floor(Math.random() * 1000)}`;

            // Persist (Mock)
            localStorage.setItem('elevator_user', JSON.stringify(State.user));

            this.loginSuccess();
        } else {
            alert('Invalid OTP');
        }
    },

    loginSuccess() {
        document.getElementById('auth-view').classList.add('hidden');
        document.getElementById('game-view').classList.remove('hidden');
        document.getElementById('game-view').classList.add('flex'); // Add flex class back

        // Initialize Game
        EventBus.emit('LOGIN_SUCCESS');
    }
};
