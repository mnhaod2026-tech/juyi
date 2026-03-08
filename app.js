// app.js
// التهيئة وقواعد البيانات المحلية
var inventory = JSON.parse(localStorage.getItem('inventory')) || [];
var customers = JSON.parse(localStorage.getItem('customers')) || [];
var directSales = JSON.parse(localStorage.getItem('directSales')) || [];
var currentCustomerIndex = -1; 

window.updateLocalData = function(newInv, newCust, newSales, newStats) {
    if (newInv) inventory = newInv;
    if (newCust) customers = newCust;
    if (newSales) directSales = newSales;
    renderInventory();
    renderCustomers();
    renderSales();
    renderStatistics();
};

function triggerSync() {
    if(window.syncDataToFirebase) window.syncDataToFirebase();
}

// دالة التبديل بين التبويبات
function switchTab(tabId, element) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
    
    document.getElementById(`tab-${tabId}`).classList.add('active');
    element.classList.add('active');

    if(tabId === 'inventory') renderInventory();
    if(tabId === 'customers') renderCustomers();
    if(tabId === 'sales') renderSales();
    if(tabId === 'statistics') renderStatistics();
    if(tabId === 'notifications') renderNotifications();
}

function updateDatalist() {
    const dl = document.getElementById('inventory-options');
    dl.innerHTML = '';
    inventory.forEach(item => {
        dl.innerHTML += `<option value="${item.name}">الكمية المتاحة: ${item.qty}</option>`;
    });
}

// ----------------- إدارة المخزون -----------------
function renderInventory() {
    const list = document.getElementById('inventory-list');
    list.innerHTML = '';
    inventory.forEach((item, index) => {
        list.innerHTML += `
            <div class="card" onclick="openItemStats(${index})" style="cursor: pointer;">
                <div class="card-info">
                    <h4>${item.name}</h4>
                    <p>الكمية: <strong>${item.qty}</strong> | السعر: ${item.sellPrice} د.ع</p>
                </div>
                <div class="card-actions" onclick="event.stopPropagation()">
                    <button class="btn-secondary" onclick="editItem(${index})"><i class="fas fa-pen"></i></button>
                    <button class="btn-danger" onclick="deleteItem(${index})"><i class="fas fa-trash"></i></button>
                </div>
            </div>
        `;
    });
    updateDatalist();
}

function openItemStats(index) {
    const item = inventory[index];
    document.getElementById('stat-item-name').innerText = item.name;
    
    let totalBuy = parseFloat(item.buyPrice || 0) * parseFloat(item.qty || 0);
    let totalSellProfit = (parseFloat(item.sellPrice || 0) - parseFloat(item.buyPrice || 0)) * parseFloat(item.qty || 0);
    
    let achievedProfit = 0;
    let stats = JSON.parse(localStorage.getItem('statistics')) || [];
    stats.forEach(s => {
        if(s.items && Array.isArray(s.items)) {
            s.items.forEach(i => {
                if(i.name === item.name) {
                    achievedProfit += parseFloat(i.profit || 0);
                }
            });
        }
    });

    document.getElementById('stat-item-buy-total').innerText = totalBuy;
    document.getElementById('stat-item-sell-profit').innerText = totalSellProfit;
    document.getElementById('stat-item-achieved-profit').innerText = achievedProfit;

    openModal('modal-item-stats');
}

function saveItem() {
    const id = document.getElementById('item-id').value;
    const name = document.getElementById('item-name').value;
    const buyPrice = document.getElementById('item-buy-price').value;
    const sellPrice = document.getElementById('item-sell-price').value;
    const qty = document.getElementById('item-qty').value;

    if (!name || !qty) return alert('الرجاء إدخال اسم المادة والكمية');

    const newItem = { name, buyPrice, sellPrice, qty };

    if (id) {
        inventory[id] = newItem; 
    } else {
        inventory.push(newItem); 
    }

    localStorage.setItem('inventory', JSON.stringify(inventory));
    triggerSync();
    closeModal('modal-add-item');
    renderInventory();
    
    document.getElementById('item-id').value = '';
    document.getElementById('item-name').value = '';
    document.getElementById('item-buy-price').value = '';
    document.getElementById('item-sell-price').value = '';
    document.getElementById('item-qty').value = '';
}

function editItem(index) {
    const item = inventory[index];
    document.getElementById('item-id').value = index;
    document.getElementById('item-name').value = item.name;
    document.getElementById('item-buy-price').value = item.buyPrice;
    document.getElementById('item-sell-price').value = item.sellPrice;
    document.getElementById('item-qty').value = item.qty;
    openModal('modal-add-item');
}

function deleteItem(index) {
    if (confirm('هل أنت متأكد من الحذف؟')) {
        inventory.splice(index, 1);
        localStorage.setItem('inventory', JSON.stringify(inventory));
        triggerSync();
        renderInventory();
    }
}

// ----------------- إدارة الزبائن -----------------
function renderCustomers(filter = '') {
    const list = document.getElementById('customers-list');
    list.innerHTML = '';
    customers.filter(c => c.name.includes(filter)).forEach((cust, index) => {
        list.innerHTML += `
            <div class="card" onclick="openCustomerDetails(${index})">
                <div class="card-info">
                    <h4>${cust.name}</h4>
                    <p>+964${cust.phone} | الأيام: ${cust.days || 30}</p>
                </div>
                <div class="card-actions" onclick="event.stopPropagation()">
                    <button class="btn-secondary" onclick="editCustomer(${index})"><i class="fas fa-pen"></i></button>
                    <button class="btn-danger" onclick="deleteCustomer(${index})"><i class="fas fa-trash"></i></button>
                </div>
            </div>
        `;
    });
}

function searchCustomers() {
    const term = document.getElementById('search-customer').value;
    renderCustomers(term);
}

function saveCustomer() {
    const id = document.getElementById('cust-id').value;
    const name = document.getElementById('cust-name').value;
    let phone = document.getElementById('cust-phone').value;
    const address = document.getElementById('cust-address').value;
    const days = document.getElementById('cust-days').value || 30;

    if (!name || !phone) return alert('الرجاء إدخال الاسم والرقم');
    if(phone.startsWith('0')) phone = phone.substring(1);

    const newCustomer = { 
        name, 
        phone, 
        address, 
        balance: 0, 
        days: parseInt(days), 
        transactions: [], 
        lastDebtDate: null 
    };

    if (id) {
        newCustomer.balance = customers[id].balance;
        newCustomer.transactions = customers[id].transactions || [];
        newCustomer.lastDebtDate = customers[id].lastDebtDate || null;
        customers[id] = newCustomer;
    } else {
        customers.push(newCustomer);
    }

    localStorage.setItem('customers', JSON.stringify(customers));
    triggerSync();
    closeModal('modal-add-customer');
    renderCustomers();
    
    document.getElementById('cust-id').value = '';
    document.getElementById('cust-name').value = '';
    document.getElementById('cust-phone').value = '';
    document.getElementById('cust-address').value = '';
    document.getElementById('cust-days').value = '';
}

function editCustomer(index) {
    const cust = customers[index];
    document.getElementById('cust-id').value = index;
    document.getElementById('cust-name').value = cust.name;
    document.getElementById('cust-phone').value = cust.phone;
    document.getElementById('cust-address').value = cust.address;
    document.getElementById('cust-days').value = cust.days || 30;
    openModal('modal-add-customer');
}

function deleteCustomer(index) {
    if (confirm('هل أنت متأكد من الحذف؟')) {
        customers.splice(index, 1);
        localStorage.setItem('customers', JSON.stringify(customers));
        triggerSync();
        renderCustomers();
    }
}

function openCustomerDetails(index) {
    currentCustomerIndex = index;
    const cust = customers[index];
    document.getElementById('detail-cust-name').innerText = cust.name;
    document.getElementById('detail-cust-balance').innerText = cust.balance;
    
    const historyList = document.getElementById('customer-transactions-list');
    historyList.innerHTML = '';
    
    if(!cust.transactions || cust.transactions.length === 0) {
        historyList.innerHTML = '<p class="empty-msg" style="text-align:center;">لا توجد معاملات سابقة لهذا الزبون.</p>';
    } else {
        for (let i = cust.transactions.length - 1; i >= 0; i--) {
            let t = cust.transactions[i];
            let details = '';
            if(t.type === 'debt') {
                details = `<strong style="color:var(--danger-color);">دين جديد:</strong> ${t.total} د.ع<br><small style="color:#555;">المواد: ${t.itemsText || t.items}</small>`;
            } else {
                details = `<strong style="color:var(--success-color);">تسديد (واصل):</strong> ${t.amount} د.ع<br><small style="color:#555;">ملاحظة: ${t.note}</small>`;
            }
            
            historyList.innerHTML += `
                <div class="card" style="flex-direction: column; align-items: flex-start; margin-bottom:10px; border-right: 4px solid ${t.type === 'debt' ? 'var(--danger-color)' : 'var(--success-color)'};">
                    <div style="width: 100%; display: flex; justify-content: space-between; border-bottom: 1px solid #eee; padding-bottom: 5px; margin-bottom: 5px;">
                        <span style="font-weight:bold; font-size:0.9rem;">${t.date}</span>
                        <span style="font-size:0.9rem;">الباقي: <strong>${t.remainingBalance}</strong> د.ع</span>
                    </div>
                    <div style="width: 100%;">
                        ${details}
                        <div style="margin-top: 10px;">
                            <button class="btn-success" style="padding: 5px 10px; font-size: 0.8rem;" onclick="shareTransaction(${currentCustomerIndex}, ${i})"><i class="fab fa-whatsapp"></i> مشاركة</button>
                        </div>
                    </div>
                </div>
            `;
        }
    }
    openModal('modal-customer-details');
}

function shareTransaction(custIndex, transIndex) {
    const cust = customers[custIndex];
    const t = cust.transactions[transIndex];
    let text = '';
    if(t.type === 'debt') {
        text = `قائمة دين جديد%0Aالاسم: ${cust.name}%0Aالتاريخ: ${t.date}%0Aالمواد: ${t.itemsText || t.items}%0Aالمبلغ: ${t.total} د.ع%0Aالباقي الحالي: ${t.remainingBalance} د.ع`;
    } else {
        text = `وصل تسديد%0Aالاسم: ${cust.name}%0Aالتاريخ: ${t.date}%0Aالمبلغ المسدد (واصل): ${t.amount} د.ع%0Aملاحظة: ${t.note}%0Aالباقي الحالي: ${t.remainingBalance} د.ع`;
    }
    window.open(`https://wa.me/964${cust.phone}?text=${text}`, '_blank');
}

// ----------------- دوال الدين والتسديد والبيع -----------------

function addItemRow(containerId) {
    const container = document.getElementById(containerId);
    const row = document.createElement('div');
    row.className = 'item-row';
    row.innerHTML = `
        <input type="text" list="inventory-options" placeholder="اسم المادة" class="item-name-input" onchange="updateRowPrice(this, '${containerId}')">
        <input type="number" placeholder="العدد" class="item-qty-input" oninput="calculateSaleTotal('${containerId}')">
        <span class="item-price" style="display:none;">0</span>
    `;
    container.appendChild(row);
}

function updateRowPrice(inputElem, containerId) {
    const itemName = inputElem.value;
    const item = inventory.find(i => i.name === itemName);
    const priceSpan = inputElem.parentElement.querySelector('.item-price');
    if(item) {
        priceSpan.innerText = item.sellPrice;
    } else {
        priceSpan.innerText = '0';
    }
    calculateSaleTotal(containerId);
}

function calculateSaleTotal(containerId) {
    if(containerId !== 'sale-items-container') return;
    let total = 0;
    const rows = document.getElementById(containerId).querySelectorAll('.item-row');
    rows.forEach(row => {
        const price = parseFloat(row.querySelector('.item-price').innerText) || 0;
        const qty = parseFloat(row.querySelector('.item-qty-input').value) || 0;
        total += (price * qty);
    });
    document.getElementById('sale-total').innerText = total;
}

// نافذة البيع المباشر والمبيعات
function openDirectSaleModal() {
    document.getElementById('sale-name').value = '';
    document.getElementById('sale-phone').value = '';
    document.getElementById('sale-items-container').innerHTML = '';
    document.getElementById('sale-total').innerText = '0';
    addItemRow('sale-items-container');
    openModal('modal-direct-sale');
}

function saveDirectSale() {
    const name = document.getElementById('sale-name').value || 'زبون نقدي';
    const phone = document.getElementById('sale-phone').value || '';
    const rows = document.getElementById('sale-items-container').querySelectorAll('.item-row');
    
    let totalSale = 0;
    let totalProfit = 0;
    let valid = true;
    let saleItems = [];

    rows.forEach(row => {
        const itemName = row.querySelector('.item-name-input').value;
        const qty = parseFloat(row.querySelector('.item-qty-input').value);
        if(!itemName || !qty) return;

        const itemIndex = inventory.findIndex(i => i.name === itemName);
        if(itemIndex === -1) {
            alert(`المادة ${itemName} غير موجودة في المخزون`);
            valid = false;
            return;
        }
        if(inventory[itemIndex].qty < qty) {
            alert(`الكمية غير كافية للمادة ${itemName} (المتاح: ${inventory[itemIndex].qty})`);
            valid = false;
            return;
        }
        
        inventory[itemIndex].qty -= qty;
        
        let itemSellTotal = inventory[itemIndex].sellPrice * qty;
        let itemBuyTotal = inventory[itemIndex].buyPrice * qty;
        let itemProfit = itemSellTotal - itemBuyTotal;

        totalSale += itemSellTotal;
        totalProfit += itemProfit;
        
        saleItems.push({
            name: itemName,
            qty: qty,
            price: inventory[itemIndex].sellPrice,
            profit: itemProfit
        });
    });

    if(!valid || totalSale === 0) return;

    let saleRecord = {
        name,
        phone,
        total: totalSale,
        profit: totalProfit,
        items: saleItems,
        date: new Date().toLocaleDateString('ar-IQ'),
        timestamp: new Date().getTime()
    };
    
    directSales.push(saleRecord);
    localStorage.setItem('directSales', JSON.stringify(directSales));

    let stats = JSON.parse(localStorage.getItem('statistics')) || [];
    stats.push({ 
        type: 'بيع مباشر', 
        customer: name, 
        total: totalSale,
        profit: totalProfit,
        items: saleItems,
        date: new Date().toLocaleDateString('ar-IQ'),
        timestamp: new Date().getTime()
    });
    
    localStorage.setItem('statistics', JSON.stringify(stats));
    localStorage.setItem('inventory', JSON.stringify(inventory));
    triggerSync();
    
    renderInventory();
    renderSales();
    alert(`تم البيع بنجاح! الإجمالي: ${totalSale} د.ع`);
    closeModal('modal-direct-sale');
}

function renderSales() {
    const list = document.getElementById('sales-list');
    list.innerHTML = '';
    if(directSales.length === 0) {
        list.innerHTML = '<p class="empty-msg">لا توجد مبيعات مباشرة حتى الآن.</p>';
        return;
    }
    directSales.slice().reverse().forEach((sale, reversedIndex) => {
        let originalIndex = directSales.length - 1 - reversedIndex;
        list.innerHTML += `
            <div class="card" style="flex-direction: column; align-items: flex-start;">
                <div style="width: 100%; display: flex; justify-content: space-between; margin-bottom: 10px;">
                    <h4 style="color:var(--primary-color);">${sale.name} ${sale.phone ? ' - ' + sale.phone : ''}</h4>
                    <span>${sale.date}</span>
                </div>
                <div style="width: 100%; margin-bottom: 10px;">
                    <p>الإجمالي: <strong>${sale.total}</strong> د.ع</p>
                </div>
                <div style="width: 100%; display: flex; gap: 5px;">
                    <button class="btn-success" onclick="shareDirectSale(${originalIndex})"><i class="fab fa-whatsapp"></i> مشاركة القائمة</button>
                    <button class="btn-danger" onclick="deleteDirectSale(${originalIndex})"><i class="fas fa-trash"></i> حذف</button>
                </div>
            </div>
        `;
    });
}

function shareDirectSale(index) {
    const sale = directSales[index];
    if(!sale.phone) {
        alert("لا يوجد رقم هاتف لهذا الزبون");
        return;
    }
    let text = `قائمة مبيعات نقدية%0Aالاسم: ${sale.name}%0Aالتاريخ: ${sale.date}%0A`;
    sale.items.forEach(item => {
        text += `- ${item.name} (العدد: ${item.qty}) السعر: ${item.price}%0A`;
    });
    text += `-----------------%0Aالإجمالي: ${sale.total} د.ع`;
    window.open(`https://wa.me/964${sale.phone}?text=${text}`, '_blank');
}

function deleteDirectSale(index) {
    if(confirm('هل أنت متأكد من حذف هذه المبيعات؟')) {
        directSales.splice(index, 1);
        localStorage.setItem('directSales', JSON.stringify(directSales));
        triggerSync();
        renderSales();
    }
}

// فتح نافذة الدين
function openDebtModal() {
    document.getElementById('debt-items-container').innerHTML = '';
    addItemRow('debt-items-container');
    document.getElementById('debt-date').valueAsDate = new Date();
    openModal('modal-debt');
}

// حفظ الدين
function saveDebt() {
    const rows = document.getElementById('debt-items-container').querySelectorAll('.item-row');
    let totalDebt = 0;
    let totalProfit = 0;
    let valid = true;
    let itemsForHistory = [];
    let itemsForStats = [];

    rows.forEach(row => {
        const name = row.querySelector('.item-name-input').value;
        const qty = parseFloat(row.querySelector('.item-qty-input').value);
        if(!name || !qty) return;

        const itemIndex = inventory.findIndex(i => i.name === name);
        if(itemIndex === -1) {
            alert(`المادة ${name} غير موجودة`);
            valid = false; return;
        }
        if(inventory[itemIndex].qty < qty) {
            alert(`الكمية غير كافية للمادة ${name}`);
            valid = false; return;
        }
        
        inventory[itemIndex].qty -= qty;
        
        let itemSellTotal = inventory[itemIndex].sellPrice * qty;
        let itemBuyTotal = inventory[itemIndex].buyPrice * qty;
        let itemProfit = itemSellTotal - itemBuyTotal;

        totalDebt += itemSellTotal;
        totalProfit += itemProfit;
        
        itemsForHistory.push(`${name} (${qty})`);
        
        itemsForStats.push({
            name: name,
            qty: qty,
            price: inventory[itemIndex].sellPrice,
            profit: itemProfit
        });
    });

    if(!valid || totalDebt === 0) return;

    customers[currentCustomerIndex].balance = parseFloat(customers[currentCustomerIndex].balance) + totalDebt;
    
    if(!customers[currentCustomerIndex].transactions) customers[currentCustomerIndex].transactions = [];
    customers[currentCustomerIndex].transactions.push({
        type: 'debt',
        date: new Date().toLocaleDateString('ar-IQ') + ' ' + new Date().toLocaleTimeString('ar-IQ'),
        total: totalDebt,
        profit: totalProfit,
        itemsText: itemsForHistory.join(' ، '),
        items: itemsForStats,
        remainingBalance: customers[currentCustomerIndex].balance
    });
    customers[currentCustomerIndex].lastDebtDate = new Date().getTime();

    let stats = JSON.parse(localStorage.getItem('statistics')) || [];
    stats.push({ 
        type: 'دين', 
        customer: customers[currentCustomerIndex].name, 
        total: totalDebt, 
        profit: totalProfit,
        items: itemsForStats,
        date: new Date().toLocaleDateString('ar-IQ'),
        timestamp: new Date().getTime()
    });
    localStorage.setItem('statistics', JSON.stringify(stats));

    localStorage.setItem('inventory', JSON.stringify(inventory));
    localStorage.setItem('customers', JSON.stringify(customers));
    triggerSync();
    
    renderInventory();
    renderCustomers();
    
    closeModal('modal-debt');
    openCustomerDetails(currentCustomerIndex); 
}

// فتح نافذة التسديد
function openPaymentModal() {
    document.getElementById('payment-current-balance').innerText = customers[currentCustomerIndex].balance;
    document.getElementById('payment-amount').value = '';
    document.getElementById('payment-note').value = '';
    openModal('modal-payment');
}

// حفظ التسديد
function savePayment() {
    const amount = parseFloat(document.getElementById('payment-amount').value);
    const note = document.getElementById('payment-note').value || 'لا توجد ملاحظات';
    
    if(!amount || amount <= 0) return alert('الرجاء إدخال مبلغ صحيح');

    customers[currentCustomerIndex].balance = parseFloat(customers[currentCustomerIndex].balance) - amount;
    
    if(!customers[currentCustomerIndex].transactions) customers[currentCustomerIndex].transactions = [];
    customers[currentCustomerIndex].transactions.push({
        type: 'payment',
        date: new Date().toLocaleDateString('ar-IQ') + ' ' + new Date().toLocaleTimeString('ar-IQ'),
        amount: amount,
        note: note,
        remainingBalance: customers[currentCustomerIndex].balance
    });

    localStorage.setItem('customers', JSON.stringify(customers));
    triggerSync();
    renderCustomers();
    
    closeModal('modal-payment');
    openCustomerDetails(currentCustomerIndex); 
}

// ----------------- دوال الإحصائيات -----------------
function renderStatistics() {
    let totalDebt = customers.reduce((sum, cust) => sum + parseFloat(cust.balance || 0), 0);
    let inventoryBuy = inventory.reduce((sum, item) => sum + (parseFloat(item.buyPrice || 0) * parseFloat(item.qty || 0)), 0);
    let inventorySell = inventory.reduce((sum, item) => sum + (parseFloat(item.sellPrice || 0) * parseFloat(item.qty || 0)), 0);
    
    let stats = JSON.parse(localStorage.getItem('statistics')) || [];
    let currentMonth = new Date().getMonth();
    let currentYear = new Date().getFullYear();
    let monthlySale = stats.reduce((sum, s) => {
        if(s.type === 'بيع مباشر' && s.timestamp) {
            let d = new Date(s.timestamp);
            if(d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
                return sum + parseFloat(s.total || 0);
            }
        }
        return sum;
    }, 0);

    document.getElementById('stat-total-debt').innerText = totalDebt;
    document.getElementById('stat-monthly-sale').innerText = monthlySale;
    document.getElementById('stat-inv-buy').innerText = inventoryBuy;
    document.getElementById('stat-inv-sell').innerText = inventorySell;

    const list = document.getElementById('statistics-list');
    list.innerHTML = '';
    
    for(let m = 1; m <= 12; m++) {
        let mSales = 0;
        let mProfit = 0;
        stats.forEach(s => {
            if(s.timestamp) {
                let d = new Date(s.timestamp);
                if(d.getMonth() + 1 === m && d.getFullYear() === currentYear) {
                    mSales += parseFloat(s.total || 0);
                    mProfit += parseFloat(s.profit || 0);
                }
            }
        });
        
        list.innerHTML += `
            <div class="card">
                <div class="card-info" style="width: 100%;">
                    <h4 style="border-bottom: 1px solid #eee; padding-bottom: 5px; margin-bottom: 5px;">شهر ${m} (${currentYear})</h4>
                    <p style="display: flex; justify-content: space-between;">
                        <span>المبيعات: <strong>${mSales}</strong> د.ع</span>
                        <span>الأرباح: <strong>${mProfit}</strong> د.ع</span>
                    </p>
                </div>
            </div>
        `;
    }
}

// ----------------- التنبيهات -----------------
function renderNotifications() {
    const list = document.getElementById('notifications-list');
    list.innerHTML = '';
    const now = new Date().getTime();
    let hasAlerts = false;
    
    customers.forEach((cust, index) => {
        if(cust.balance > 0 && cust.lastDebtDate && cust.days) {
            const daysPassed = (now - cust.lastDebtDate) / (1000 * 60 * 60 * 24);
            if(daysPassed > cust.days) {
                hasAlerts = true;
                list.innerHTML += `
                    <div class="card" style="border-right: 5px solid var(--danger-color);">
                        <div class="card-info">
                            <h4 style="color:var(--danger-color);"><i class="fas fa-exclamation-triangle"></i> ${cust.name}</h4>
                            <p>تجاوز المدة! الأيام المسموحة: ${cust.days} | الباقي: <strong>${cust.balance}</strong> د.ع</p>
                        </div>
                        <div class="card-actions">
                            <button class="btn-primary" onclick="openCustomerDetails(${index})">عرض التفاصيل</button>
                        </div>
                    </div>
                `;
            }
        }
    });
    
    if(!hasAlerts) {
        list.innerHTML = '<p class="empty-msg">لا توجد تنبيهات لزبائن متأخرين عن السداد حالياً.</p>';
    }
}

function openModal(id) { document.getElementById(id).style.display = 'flex'; }
function closeModal(id) { document.getElementById(id).style.display = 'none'; }

function exportData() {
    const data = { 
        inventory, 
        customers, 
        statistics: JSON.parse(localStorage.getItem('statistics')) || [],
        directSales: JSON.parse(localStorage.getItem('directSales')) || []
    };
    const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'backup_makhzan.json';
    a.click();
}

function importData(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            if(data.inventory) localStorage.setItem('inventory', JSON.stringify(data.inventory));
            if(data.customers) localStorage.setItem('customers', JSON.stringify(data.customers));
            if(data.statistics) localStorage.setItem('statistics', JSON.stringify(data.statistics));
            if(data.directSales) localStorage.setItem('directSales', JSON.stringify(data.directSales));
            triggerSync();
            alert('تم استعادة النسخة بنجاح! سيتم تحديث الصفحة.');
            location.reload();
        } catch(err) {
            alert('خطأ في الملف');
        }
    };
    reader.readAsText(file);
}

// تحميل البيانات عند بدء التشغيل
window.onload = () => {
    renderInventory();
    renderCustomers();
    renderSales();
};

// --- PWA Setup ---
window.deferredPrompt = null;

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    window.deferredPrompt = e;
    if (document.getElementById('login-modal') && document.getElementById('login-modal').style.display === 'none') {
        openModal('install-modal');
    }
});

window.installApp = async () => {
    if (window.deferredPrompt) {
        window.deferredPrompt.prompt();
        const { outcome } = await window.deferredPrompt.userChoice;
        window.deferredPrompt = null;
        closeModal('install-modal');
    }
};

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js').catch(err => console.log('SW registration failed:', err));
    });
}
