"""
GitHub Secret Updater
Automatically updates GitHub repository secrets using the GitHub REST API
"""

import os
import logging
import base64
import requests
from typing import Optional

logger = logging.getLogger(__name__)

try:
    from nacl import public

    NACL_AVAILABLE = True
except ImportError:
    NACL_AVAILABLE = False
    logger.warning("PyNaCl not available. GitHub secret updates will not work.")


class GitHubSecretUpdater:
    """Updates GitHub repository secrets using the GitHub REST API."""

    def __init__(self, token: str, repo_owner: str, repo_name: str):
        """
        Initialize GitHub Secret Updater.

        Args:
            token: GitHub token with secrets write permission
            repo_owner: Repository owner (username or org)
            repo_name: Repository name
        """
        self.token = token
        self.repo_owner = repo_owner
        self.repo_name = repo_name
        self.api_base = "https://api.github.com"
        self.headers = {
            "Accept": "application/vnd.github+json",
            "Authorization": f"Bearer {token}",
            "X-GitHub-Api-Version": "2022-11-28",
        }

    def get_public_key(self) -> Optional[dict]:
        """
        Get the repository's public key for secret encryption.

        Returns:
            Dict with 'key' and 'key_id' or None if failed
        """
        try:
            url = f"{self.api_base}/repos/{self.repo_owner}/{self.repo_name}/actions/secrets/public-key"
            response = requests.get(url, headers=self.headers, timeout=10)

            if response.status_code != 200:
                logger.error(f"Failed to get public key: {response.status_code} - {response.text}")
                return None

            data = response.json()
            return {"key": data["key"], "key_id": data["key_id"]}

        except Exception as e:
            logger.error(f"Error getting public key: {e}")
            return None

    def encrypt_secret(self, public_key: str, secret_value: str) -> str:
        """
        Encrypt a secret using the repository's public key.

        Args:
            public_key: Base64-encoded public key from GitHub
            secret_value: The secret value to encrypt

        Returns:
            Base64-encoded encrypted value
        """
        if not NACL_AVAILABLE:
            raise ImportError("PyNaCl is required for secret encryption. Install with: pip install PyNaCl")

        # Decode the public key
        public_key_bytes = base64.b64decode(public_key)

        # Create a sealed box
        sealed_box = public.SealedBox(public.PublicKey(public_key_bytes))

        # Encrypt the secret
        encrypted = sealed_box.encrypt(secret_value.encode("utf-8"))

        # Return base64-encoded encrypted value
        return base64.b64encode(encrypted).decode("utf-8")

    def update_secret(self, secret_name: str, secret_value: str) -> bool:
        """
        Update or create a repository secret.

        Args:
            secret_name: Name of the secret (e.g., 'INSTAGRAM_SECRET')
            secret_value: Value of the secret

        Returns:
            True if successful, False otherwise
        """
        try:
            # Get public key
            logger.info(f"Getting public key for repository {self.repo_owner}/{self.repo_name}")
            key_info = self.get_public_key()
            if not key_info:
                logger.error("Failed to get public key")
                return False

            # Encrypt secret
            logger.info(f"Encrypting secret '{secret_name}'")
            encrypted_value = self.encrypt_secret(key_info["key"], secret_value)

            # Update secret
            url = f"{self.api_base}/repos/{self.repo_owner}/{self.repo_name}/actions/secrets/{secret_name}"
            payload = {"encrypted_value": encrypted_value, "key_id": key_info["key_id"]}

            response = requests.put(url, headers=self.headers, json=payload, timeout=10)

            if response.status_code in [201, 204]:
                logger.info(f"✅ Successfully updated secret '{secret_name}'")
                return True
            else:
                logger.error(f"Failed to update secret: {response.status_code} - {response.text}")
                return False

        except Exception as e:
            logger.error(f"Error updating secret: {e}")
            return False


def update_instagram_secret_from_env(github_token: str, repo_owner: str, repo_name: str) -> bool:
    """
    Update the INSTAGRAM_SECRET GitHub secret with current .env.social content.

    Args:
        github_token: GitHub token with secrets write permission
        repo_owner: Repository owner
        repo_name: Repository name

    Returns:
        True if successful, False otherwise
    """
    try:
        # Read current Instagram credentials from environment
        access_token = os.getenv("INSTAGRAM_ACCESS_TOKEN")
        username = os.getenv("INSTAGRAM_USERNAME")
        app_id = os.getenv("INSTAGRAM_APP_ID")
        app_secret = os.getenv("INSTAGRAM_APP_SECRET")

        if not all([access_token, username, app_id, app_secret]):
            logger.error("Missing Instagram credentials in environment")
            return False

        # Construct .env.social content
        secret_content = (
            f"INSTAGRAM_ACCESS_TOKEN={access_token}\n"
            f"INSTAGRAM_USERNAME={username}\n"
            f"INSTAGRAM_APP_ID={app_id}\n"
            f"INSTAGRAM_APP_SECRET={app_secret}\n"
        )

        # Update the secret
        updater = GitHubSecretUpdater(github_token, repo_owner, repo_name)
        return updater.update_secret("INSTAGRAM_SECRET", secret_content)

    except Exception as e:
        logger.error(f"Error updating Instagram secret: {e}")
        return False


def update_tiktok_secret_from_env(github_token: str, repo_owner: str, repo_name: str) -> bool:
    """
    Update the TIKTOK_SECRET GitHub secret with current .env.social content.

    Args:
        github_token: GitHub token with secrets write permission
        repo_owner: Repository owner
        repo_name: Repository name

    Returns:
        True if successful, False otherwise
    """
    try:
        # Read current TikTok credentials from environment
        access_token = os.getenv("TIKTOK_ACCESS_TOKEN")
        refresh_token = os.getenv("TIKTOK_REFRESH_TOKEN")
        client_key = os.getenv("TIKTOK_CLIENT_KEY")
        client_secret = os.getenv("TIKTOK_CLIENT_SECRET")

        if not all([access_token, refresh_token, client_key, client_secret]):
            logger.error("Missing TikTok credentials in environment")
            return False

        # Construct .env.social content for TikTok
        secret_content = (
            f"TIKTOK_ACCESS_TOKEN={access_token}\n"
            f"TIKTOK_REFRESH_TOKEN={refresh_token}\n"
            f"TIKTOK_CLIENT_KEY={client_key}\n"
            f"TIKTOK_CLIENT_SECRET={client_secret}\n"
        )

        # Update the secret
        updater = GitHubSecretUpdater(github_token, repo_owner, repo_name)
        return updater.update_secret("TIKTOK_SECRET", secret_content)

    except Exception as e:
        logger.error(f"Error updating TikTok secret: {e}")
        return False
