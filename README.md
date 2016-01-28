# Goals and Status

This module will simplify the process of integrating CheddarGetter into your existing node.js apps.

* `getAllPricingPlans(callback)`
* `getPricingPlan(planCode, callback)`
* `getAllCustomers([searchParams], callback)`
* `getCustomer(customerCode, callback)`
* `createCustomer(customerData, callback)`
* `editCustomerAndSubscription(customerData, callback)` or `updateCustomerAndSubscription(customerData, callback)`
* `editCustomer(customerCode, customerData, callback)` or `updateCustomer(customerCode, customerData, callback)`
* `editSubscription(customerCode, customerData, callback)` or `updateSubscription(customerCode, customerData, callback)`
* `deleteCustomer(customerCode, callback)`
* `cancelSubscription(customerCode, callback)`
* `addItem(customerCode, itemCode, [amount], callback)`
* `removeItem(customerCode, itemCode, [amount], callback)`
* `setItemQuantity(customerCode, itemCode, amount, callback)`
* `addCustomCharge(customerCode, chargeCode, quantity, amount, description, callback)`
* `deleteCustomCharge(customerCode, chargeId, callback)`
* `resendInvoiceEmail(idOrNumber, callback)`
* `oneTimeInvoice(customerCode, {data}, callback)`

All callbacks are called with `error` and `results` parameters.

Not all API calls have been fully tested and many unit tests are still missing.

# Install

```
npm install cg
```

# Usage

```javascript
var CheddarGetter = require("cg");

var cg = new CheddarGetter("email@example.com", "passwordExample", "ProductCode");

cg.getAllPricingPlans(function (error, results) {
	console.log(error, results);
});
```
# Tests
First add a config file (`config.json`) with all your CheddarGetter credentials:

```javascript
{
  "email": "EMAIL",
  "pass": "PASSWORD",
  "productCode": "PRODUCTCODE",
  "planCode": "PLANCODE",
  "itemCode": "ITEMCODE"
}
```


```
npm test
```

# Credits
Original work was done by [Kevin Smith](https://github.com/respectTheCode).
