import { v4 as idGen } from 'uuid';
import * as products from './items.json';
import * as sqlite3 from 'sqlite3';

type Product = {
  id: number;
  name: string;
  price: number;
  description: string;
  quantity: number;
};

type Customer = {
  id: string;
  name: string;
  age: number;
  cart: Product[];
};

const db = new sqlite3.Database(':memory:');

function createCustomer(name: string, age: number): Promise<Customer> {
  return new Promise((resolve, reject) => {
    const id = idGen();
    db.run(
      'INSERT INTO Customers (id, name, age) VALUES (?, ?, ?)',
      [id, name, age],
      function (err) {
        if (err) {
          reject(err);
        } else {
          resolve({ id, name, age, cart: [] });
        }
      }
    );
  });
}

function createProduct(id: number, name: string, price: number, description: string): Product {
  return {
    id,
    name,
    price,
    description,
    quantity: 0,
  };
}

function addToCart(product: Product, customer: Customer): void {
  customer.cart.push(product);
}

function removeFromCart(product: Product, customer: Customer): void {
  customer.cart = customer.cart.filter((cartProduct) => cartProduct.id !== product.id);
}

function removeQuantityFromCart(product: Product, customer: Customer, quantity: number): void {
  const existingProduct = customer.cart.find((cartProduct) => cartProduct.id === product.id);
  if (existingProduct) {
    existingProduct.quantity -= quantity;
    if (existingProduct.quantity <= 0) {
      removeFromCart(product, customer);
    }
  }
}

function calculateCartTotal(customer: Customer): number {
  return customer.cart.reduce((total, product) => total + product.price, 0);
}

function printCustomerCart(customer: Customer): void {
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
        const newProduct = createProduct(
          item.id,
          item.name,
          item.price,
          item.description
        );
        addToCart(newProduct, customer);
      });

      printCustomerCart(customer);
      console.log('Cart Total:', calculateCartTotal(customer));

      db.all('SELECT * FROM Customers', [], (err, rows) => {
        if (err) {
          console.error('Error selecting customers:', err);
        } else {
          console.log('Customers:');
          console.log(rows);
        }
      });

      db.all('SELECT * FROM Products', [], (err, rows) => {
        if (err) {
          console.error('Error selecting products:', err);
        } else {
          console.log('Products:');
          console.log(rows);
        }
      });

      db.run('DELETE FROM Customers WHERE id = ?', [customer.id], function (err) {
        if (err) {
          console.error('Error deleting customer:', err);
        } else {
          console.log('Customer deleted successfully');
        }
      });

      db.run('DELETE FROM Products', function (err) {
        if (err) {
          console.error('Error deleting products:', err);
        } else {
          console.log('Products deleted successfully');
        }
      });

      db.close();
    })
    .catch((err) => {
      console.error('Error creating customer:', err);
    });
});
