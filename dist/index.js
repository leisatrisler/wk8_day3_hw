"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const uuid_1 = require("uuid");
const products = require("./items.json");
const sqlite3 = require("sqlite3");
const db = new sqlite3.Database(':memory:');
function createCustomer(name, age) {
    return new Promise((resolve, reject) => {
        const id = (0, uuid_1.v4)();
        db.run('INSERT INTO Customers (id, name, age) VALUES (?, ?, ?)', [id, name, age], function (err) {
            if (err) {
                reject(err);
            }
            else {
                resolve({ id, name, age, cart: [] });
            }
        });
    });
}
function createProduct(id, name, price, description) {
    return {
        id,
        name,
        price,
        description,
        quantity: 0,
    };
}
function addToCart(product, customer) {
    customer.cart.push(product);
}
function removeFromCart(product, customer) {
    customer.cart = customer.cart.filter((cartProduct) => cartProduct.id !== product.id);
}
function removeQuantityFromCart(product, customer, quantity) {
    const existingProduct = customer.cart.find((cartProduct) => cartProduct.id === product.id);
    if (existingProduct) {
        existingProduct.quantity -= quantity;
        if (existingProduct.quantity <= 0) {
            removeFromCart(product, customer);
        }
    }
}
function calculateCartTotal(customer) {
    return customer.cart.reduce((total, product) => total + product.price, 0);
}
function printCustomerCart(customer) {
    console.log("Customer's Cart:");
    customer.cart.forEach((product) => {
        console.log(`Name: ${product.name}`);
        console.log(`Price: $${product.price}`);
        console.log(`Description: ${product.description}`);
        console.log('-------------------');
    });
}
db.serialize(() => {
    db.run(`
    CREATE TABLE IF NOT EXISTS Customers (
      id TEXT PRIMARY KEY,
      name TEXT,
      age INTEGER
    )
  `);
    db.run(`
    CREATE TABLE IF NOT EXISTS Products (
      id INTEGER PRIMARY KEY,
      name TEXT,
      price REAL,
      description TEXT,
      quantity INTEGER DEFAULT 0
    )
  `);
    const stmt = db.prepare('INSERT INTO Products (id, name, price, description) VALUES (?, ?, ?, ?)');
    products.forEach((item) => {
        stmt.run(item.id, item.name, item.price, item.description);
    });
    stmt.finalize();
    createCustomer('John Doe', 25)
        .then((customer) => {
        products.forEach((item) => {
            const newProduct = createProduct(item.id, item.name, item.price, item.description);
            addToCart(newProduct, customer);
        });
        printCustomerCart(customer);
        console.log('Cart Total:', calculateCartTotal(customer));
        db.all('SELECT * FROM Customers', [], (err, rows) => {
            if (err) {
                console.error('Error selecting customers:', err);
            }
            else {
                console.log('Customers:');
                console.log(rows);
            }
        });
        db.all('SELECT * FROM Products', [], (err, rows) => {
            if (err) {
                console.error('Error selecting products:', err);
            }
            else {
                console.log('Products:');
                console.log(rows);
            }
        });
        // Delete statements
        db.run('DELETE FROM Customers WHERE id = ?', [customer.id], function (err) {
            if (err) {
                console.error('Error deleting customer:', err);
            }
            else {
                console.log('Customer deleted successfully');
            }
        });
        db.run('DELETE FROM Products', function (err) {
            if (err) {
                console.error('Error deleting products:', err);
            }
            else {
                console.log('Products deleted successfully');
            }
        });
        // Close the database connection when done
        db.close();
    })
        .catch((err) => {
        console.error('Error creating customer:', err);
    });
});
