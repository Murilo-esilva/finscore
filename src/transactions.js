(function(window){
  const KEY = 'finscore_transactions';
  function load(){ try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch(e){ return []; } }
  function save(txs){ localStorage.setItem(KEY, JSON.stringify(txs)); }
  function genId(){ return Date.now().toString(36) + Math.random().toString(36).slice(2,8); }

  function getTransactions(){ return load(); }

  function addTransaction(description, amount, type){
    const amt = Number(amount);
    if (isNaN(amt) || amt === 0) throw new Error('Valor inválido (diferente de zero)');
    const value = (type === 'expense' || type === 'despesa') ? -Math.abs(amt) : Math.abs(amt);
    const tx = { id: genId(), description: description || '', amount: value, date: new Date().toISOString() };
    const txs = load();
    txs.unshift(tx);
    save(txs);
    return tx;
  }

  function addIncome(description, amount){ return addTransaction(description, amount, 'income'); }
  function addExpense(description, amount){ return addTransaction(description, amount, 'expense'); }

  function removeTransaction(id){
    const txs = load().filter(t => t.id !== id);
    save(txs);
    return txs;
  }

  function getTotals(){
    const txs = load();
    const income = txs.filter(t => t.amount > 0).reduce((s,n)=>s + Number(n.amount), 0);
    const expenses = txs.filter(t => t.amount < 0).reduce((s,n)=>s + Number(n.amount), 0);
    const balance = income + expenses;
    return { income, expenses: Math.abs(expenses), balance };
  }

  window.FinScore = { getTransactions, addTransaction, addIncome, addExpense, removeTransaction, getTotals };
})(window);
