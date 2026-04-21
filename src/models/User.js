// Exemplo usando Mongoose (MongoDB)
const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  nome: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  senha: { type: String, required: true },
  cargo: { type: String, enum: ['vendedor', 'estoquista', 'caixa', 'gerente'], required: true },
  // Aqui guardamos o "endereço" do celular para o Push
  pushSubscription: { type: Object, default: null } 
});

module.exports = mongoose.model('User', UserSchema);