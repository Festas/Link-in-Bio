"""
Tests for Enhanced Authentication Module
"""
import pytest
from app.auth_unified import (
    hash_password,
    verify_password,
    validate_password_strength,
    create_session,
    validate_session,
    invalidate_session,
    generate_2fa_secret,
    verify_2fa_code,
    get_2fa_qr_code_url,
    cleanup_expired_sessions,
)
import pyotp
from datetime import datetime, timedelta, timezone


class TestPasswordHashing:
    """Test password hashing functionality."""
    
    def test_hash_password(self):
        """Test password hashing."""
        password = "MySecurePassword123!"
        hashed = hash_password(password)
        
        assert hashed is not None
        assert hashed != password
        assert len(hashed) > 20  # Bcrypt hashes are typically 60 chars
    
    def test_verify_password_correct(self):
        """Test password verification with correct password."""
        password = "MySecurePassword123!"
        hashed = hash_password(password)
        
        assert verify_password(password, hashed) is True
    
    def test_verify_password_incorrect(self):
        """Test password verification with incorrect password."""
        password = "MySecurePassword123!"
        hashed = hash_password(password)
        
        assert verify_password("WrongPassword", hashed) is False
    
    def test_different_passwords_different_hashes(self):
        """Test that same password gets different hashes (salt)."""
        password = "MySecurePassword123!"
        hash1 = hash_password(password)
        hash2 = hash_password(password)
        
        # Different hashes due to different salts
        assert hash1 != hash2
        # But both should verify
        assert verify_password(password, hash1) is True
        assert verify_password(password, hash2) is True


class TestPasswordStrength:
    """Test password strength validation."""
    
    def test_weak_password_too_short(self):
        """Test that short passwords are rejected."""
        is_valid, msg = validate_password_strength("Short1!")
        assert is_valid is False
        assert "12 characters" in msg
    
    def test_weak_password_no_uppercase(self):
        """Test that passwords without uppercase are rejected."""
        is_valid, msg = validate_password_strength("weakpassword123!")
        assert is_valid is False
        assert "uppercase" in msg
    
    def test_weak_password_no_lowercase(self):
        """Test that passwords without lowercase are rejected."""
        is_valid, msg = validate_password_strength("WEAKPASSWORD123!")
        assert is_valid is False
        assert "lowercase" in msg
    
    def test_weak_password_no_digit(self):
        """Test that passwords without digits are rejected."""
        is_valid, msg = validate_password_strength("WeakPassword!@#")
        assert is_valid is False
        assert "digit" in msg
    
    def test_weak_password_no_special(self):
        """Test that passwords without special chars are rejected."""
        is_valid, msg = validate_password_strength("WeakPassword123")
        assert is_valid is False
        assert "special character" in msg
    
    def test_weak_password_common(self):
        """Test that common passwords are rejected."""
        is_valid, msg = validate_password_strength("Password123!")
        assert is_valid is False
        assert "too common" in msg
    
    def test_strong_password(self):
        """Test that strong passwords are accepted."""
        is_valid, msg = validate_password_strength("MyVerySecureP@ssw0rd2024!")
        assert is_valid is True
        assert msg == ""


class TestSessionManagement:
    """Test session management."""
    
    def setup_method(self):
        """Clear sessions before each test."""
        from app.auth_unified import sessions
        sessions.clear()
    
    def test_create_session(self):
        """Test session creation."""
        token = create_session("testuser")
        assert token is not None
        assert len(token) > 20
    
    def test_validate_session_valid(self):
        """Test validating a valid session."""
        token = create_session("testuser")
        username = validate_session(token)
        assert username == "testuser"
    
    def test_validate_session_invalid(self):
        """Test validating an invalid session."""
        username = validate_session("invalid-token")
        assert username is None
    
    def test_invalidate_session(self):
        """Test session invalidation."""
        token = create_session("testuser")
        assert validate_session(token) == "testuser"
        
        invalidate_session(token)
        assert validate_session(token) is None
    
    def test_session_expiry(self):
        """Test that expired sessions are invalid."""
        from app.auth_unified import sessions
        
        # Create a session
        token = create_session("testuser")
        
        # Manually expire it
        sessions[token]["expires_at"] = datetime.utcnow() - timedelta(hours=1)
        
        # Should be invalid
        username = validate_session(token)
        assert username is None
    
    def test_remember_me_extends_session(self):
        """Test that remember_me creates longer sessions."""
        from app.auth_unified import sessions, SESSION_EXPIRY_HOURS
        
        # Normal session
        token1 = create_session("testuser", remember_me=False)
        normal_expiry = sessions[token1]["expires_at"]
        
        # Remember me session
        token2 = create_session("testuser", remember_me=True)
        extended_expiry = sessions[token2]["expires_at"]
        
        # Extended session should expire later
        assert extended_expiry > normal_expiry
        
        # Should be approximately 7x longer
        normal_duration = (normal_expiry - sessions[token1]["created_at"]).total_seconds()
        extended_duration = (extended_expiry - sessions[token2]["created_at"]).total_seconds()
        assert extended_duration > normal_duration * 6


class TestTwoFactorAuth:
    """Test 2FA functionality."""
    
    def test_generate_2fa_secret(self):
        """Test 2FA secret generation."""
        secret = generate_2fa_secret("testuser")
        assert secret is not None
        assert len(secret) == 32  # Base32 secret length
    
    def test_get_qr_code_url(self):
        """Test QR code URL generation."""
        secret = generate_2fa_secret("testuser")
        url = get_2fa_qr_code_url("testuser", "TestApp")
        
        assert url is not None
        assert "otpauth://totp/" in url
        assert "testuser" in url
        assert "TestApp" in url
        assert secret in url
    
    def test_verify_2fa_code_valid(self):
        """Test 2FA code verification with valid code."""
        secret = generate_2fa_secret("testuser")
        totp = pyotp.TOTP(secret)
        code = totp.now()
        
        assert verify_2fa_code("testuser", code) is True
    
    def test_verify_2fa_code_invalid(self):
        """Test 2FA code verification with invalid code."""
        generate_2fa_secret("testuser")
        
        assert verify_2fa_code("testuser", "000000") is False
    
    def test_verify_2fa_code_no_secret(self):
        """Test 2FA code verification without secret setup."""
        assert verify_2fa_code("nonexistent", "123456") is False


class TestSessionCleanup:
    """Test session cleanup functionality."""
    
    def setup_method(self):
        """Clear sessions before each test."""
        from app.auth_unified import sessions
        sessions.clear()
    
    def test_cleanup_expired_sessions(self):
        """Test cleaning up expired sessions."""
        from app.auth_unified import sessions
        
        # Create some sessions
        token1 = create_session("user1")
        token2 = create_session("user2")
        token3 = create_session("user3")
        
        # Expire some of them
        sessions[token1]["expires_at"] = datetime.utcnow() - timedelta(hours=1)
        sessions[token2]["expires_at"] = datetime.utcnow() - timedelta(hours=2)
        # token3 remains valid
        
        assert len(sessions) == 3
        
        # Cleanup
        cleanup_expired_sessions()
        
        # Only valid session should remain
        assert len(sessions) == 1
        assert token3 in sessions
        assert token1 not in sessions
        assert token2 not in sessions


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
