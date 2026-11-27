export const usernamePattern = /^[a-z0-9][a-z0-9._-]{2,31}$/;

function fromName(value) {
  const result = String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '.').replace(/^[._-]+|[._-]+$/g, '').slice(0, 32);
  return result.length >= 3 ? result : 'usuario';
}

// Añade identificadores a cuentas anteriores sin modificar contraseñas, roles ni datos comerciales.
export async function migrateUsernames(User, {adminEmail = process.env.ADMIN_EMAIL, adminUsername = process.env.ADMIN_USERNAME || 'admin'} = {}) {
  if (!usernamePattern.test(adminUsername.toLowerCase())) throw new Error('ADMIN_USERNAME debe tener 3–32 caracteres: letras, números, punto, guion o guion bajo.');
  const missing = {$or: [{username: {$exists: false}}, {username: null}, {username: ''}]};
  const users = await User.find(missing).select('_id name email').sort({createdAt: 1, _id: 1}).lean();
  const used = new Set((await User.distinct('username', {username: {$type: 'string'}})).map(value => value.toLowerCase()));
  const result = [];
  for (const user of users) {
    const base = adminEmail && user.email === adminEmail.toLowerCase() ? adminUsername.toLowerCase() : fromName(user.name);
    let index = 1;
    while (true) {
      const suffix = index === 1 ? '' : `_${index}`;
      const username = base.slice(0, 32 - suffix.length) + suffix;
      index++;
      if (used.has(username)) continue;
      try {
        const update = await User.updateOne({_id: user._id, ...missing}, {$set: {username}}, {runValidators: true});
        if (update.modifiedCount) result.push({_id: String(user._id), username});
        used.add(username);
        break;
      } catch (error) {if (error.code !== 11000) throw error; used.add(username);}
    }
  }
  return result;
}
