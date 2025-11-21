export function setAvatarEffect(enabled) {
    try {
        const img = document.getElementById('profile-image');
        if (!img) return;
        if (enabled) {
            img.classList.add('picasso-avatar');
        } else {
            img.classList.remove('picasso-avatar');
        }
    } catch (e) {
        console.warn('Picasso: setAvatarEffect failed', e);
    }
}
