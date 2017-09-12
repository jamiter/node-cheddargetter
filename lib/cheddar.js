var xml2js = require('xml2js');
var rp = require('request-promise-native');

var Cheddar = function Cheddar(user, pass, productCode) {
    this.auth = 'Basic ' + Buffer.from(user + ':' + pass).toString('base64');
    this.productCode = productCode;
};

var arrays = [
    'plans',
    'customers',
    'items',
    'charges',
    'invoices',
    'subscriptions',
    'transactions',
    'promotions',
];

function validator(xpath, currentValue, newValue) {
    // Empty values should be null
    if (!newValue) {
        return null;
    }

    // Parse integers
    if (!isNaN(newValue)) {
        return +newValue;
    }

    var paths = xpath.split('/');
    var item = paths[paths.length - 1];

    if (arrays.indexOf(item) === -1) {
        return newValue;
    }
    // Slice of the 's'
    var child = item.slice(0, item.length - 1);

    // Make sure the child is an array using the concat function
    return [].concat(newValue[child]);
}

function getHost() {
    return process.env.CHEDDAR_HOST || process.env.CHEDDARGETTER_HOST || 'getcheddar.com';
}

function getPort() {
    return process.env.CHEDDAR_PORT || process.env.CHEDDARGETTER_PORT || 443;
}

var xmlParseOptions = {
    explicitRoot: true,
    explicitArray: false,
    validator: validator,
    emptyTag: null,
    mergeAttrs: true,
};

function parseResult(data) {
    return new Promise(function initPromise(resolve, reject) {
        var parser = new xml2js.Parser(xmlParseOptions);

        parser.parseString(data, function parse(err, xml) {
            if (err) { // Handle error
                reject(err);
                return;
            } else if (!xml) { // Handle empty xml
                resolve(null);
                return;
            }

            var type = Object.keys(xml)[0];

            if (type === 'error') {
                var error = new Error(xml[type]._);
                error.code = +xml[type].code;
                reject(error);
            } else {
                resolve(xml[type]);
            }
        });
    });
}

function handleCallback(callback, promise) {
    if (callback) {
        promise
            .then(function handleSuccess(data) {
                callback(null, data);
            })
            .catch(function handleError(err) {
                callback(err);
            });
    }
}

Cheddar.prototype.callAPI = function callAPI(data, path, callback) {
    if (typeof path === 'function') {
        callback = path;
        path = data;
        data = null;
    } else if (typeof data === 'string') {
        path = data;
        data = null;
    }

    // Encode the path, because some codes can contain spaces
    var encodedPath = encodeURI(path);

    var requestOptions = {
        uri: 'https://' + getHost() + ':' + getPort() + '/xml' + encodedPath,
        headers: {
            authorization: this.auth,
        },
        form: data,
    };

    var promise = rp.post(requestOptions)
        .then(parseResult)
        .catch(function handleError(err) {
            if (err.error && err.error.indexOf('<?xml') === 0) {
                return parseResult(err.error).then(function createErrorFromXml(xml) {
                    var error = new Error(xml.error._);
                    error.code = Number(xml.error.code);
                    throw error;
                });
            }
            return err;
        });

    handleCallback(callback, promise);

    return promise;
};

Cheddar.prototype.getAllPricingPlans = function getAllPricingPlans(callback) {
    return this.callAPI('/plans/get/productCode/' + this.productCode, callback);
};

Cheddar.prototype.getPricingPlan = function getPricingPlan(code, callback) {
    var promise = this.callAPI('/plans/get/productCode/' + this.productCode + '/code/' + code)
        .then(function getFirstPlan(plans) {
            // Return the first plan (it should only contain 1)
            return plans && plans[0];
        });

    handleCallback(callback, promise);

    return promise;
};

Cheddar.prototype.getAllCustomers = function getAllCustomers(data, callback) {
    if (!callback && typeof (data) === 'function') {
        callback = data;
        data = null;
    }
    return this.callAPI(data, '/customers/get/productCode/' + this.productCode, callback);
};

Cheddar.prototype.getCustomer = function getCustomer(code, callback) {
    var promise = this.callAPI('/customers/get/productCode/' + this.productCode + '/code/' + code)
        .then(function getFirstCustomer(customers) {
            if (!customers || !customers.length) {
                throw new Error('No customers could be retrieved');
            }
            // Return the first customer (it should only contain 1)
            return customers[0];
        });

    handleCallback(callback, promise);

    return promise;
};

Cheddar.prototype.createCustomer = function createCustomer(data, callback) {
    return this.callAPI(data, '/customers/new/productCode/' + this.productCode, callback);
};

Cheddar.prototype.editCustomerAndSubscription =
function editCustomerAndSubscription(code, data, callback) {
    return this.callAPI(data, '/customers/edit/productCode/' + this.productCode + '/code/' + code, callback);
};
Cheddar.prototype.updateCustomerAndSubscription = Cheddar.prototype.editCustomerAndSubscription;

Cheddar.prototype.editCustomer = function editCustomer(code, data, callback) {
    return this.callAPI(data, '/customers/edit-customer/productCode/' + this.productCode + '/code/' + code, callback);
};
Cheddar.prototype.updateCustomer = Cheddar.prototype.editCustomer;

Cheddar.prototype.editSubscription = function editSubscription(code, data, callback) {
    return this.callAPI(data, '/customers/edit-subscription/productCode/' + this.productCode + '/code/' + code, callback);
};
Cheddar.prototype.updateSubscription = Cheddar.prototype.editSubscription;

Cheddar.prototype.deleteCustomer = function deleteCustomer(code, callback) {
    return this.callAPI('/customers/delete/productCode/' + this.productCode + '/code/' + code, callback);
};

Cheddar.prototype.deleteAllCustomers = function deleteAllCustomers(unixtimestamp, callback) {
    return this.callAPI('/customers/delete-all/confirm/' + unixtimestamp + '/productCode/' + this.productCode, callback);
};

Cheddar.prototype.cancelSubscription = function cancelSubscription(code, callback) {
    return this.callAPI('/customers/cancel/productCode/' + this.productCode + '/code/' + code, callback);
};

Cheddar.prototype.addItem = function addItem(code, itemCode, amount, callback) {
    if (!callback && typeof amount === 'function') {
        callback = amount;
        amount = null;
    }

    var data;

    if (amount) {
        data = { quantity: amount.toString() };
    }

    return this.callAPI(data, '/customers/add-item-quantity/productCode/' + this.productCode + '/code/' + code + '/itemCode/' + itemCode, callback);
};

Cheddar.prototype.removeItem = function removeItem(code, itemCode, amount, callback) {
    if (!callback && typeof amount === 'function') {
        callback = amount;
        amount = null;
    }

    var data;

    if (amount) {
        data = { quantity: amount.toString() };
    }

    return this.callAPI(data, '/customers/remove-item-quantity/productCode/' + this.productCode + '/code/' + code + '/itemCode/' + itemCode, callback);
};

Cheddar.prototype.setItemQuantity = function setItemQuantity(code, itemCode, amount, callback) {
    var data = { quantity: amount.toString() };
    return this.callAPI(data, '/customers/set-item-quantity/productCode/' + this.productCode + '/code/' + code + '/itemCode/' + itemCode, callback);
};

Cheddar.prototype.addCustomCharge =
function addCustomCharge(code, chargeCode, quantity, amount, description, callback) {
    var data = {
        chargeCode: chargeCode,
        quantity: quantity.toString(),
        eachAmount: amount.toString(),
        description: description,
    };

    return this.callAPI(data, '/customers/add-charge/productCode/' + this.productCode + '/code/' + code, callback);
};

Cheddar.prototype.deleteCustomCharge = function deleteCustomCharge(code, chargeId, callback) {
    var data = {
        chargeId: chargeId,
    };
    return this.callAPI(data, '/customers/delete-charge/productCode/' + this.productCode + '/code/' + code, callback);
};

Cheddar.prototype.resendInvoiceEmail = function resendInvoiceEmail(idOrNumber, callback) {
    var data;

    if (isNaN(idOrNumber)) {
        data = { id: idOrNumber };
    } else {
        data = { number: idOrNumber };
    }

    return this.callAPI(data, '/invoices/send-email/productCode/' + this.productCode, callback);
};

Cheddar.prototype.oneTimeInvoice = function oneTimeInvoice(customerCode, data, callback) {
    return this.callAPI(data, '/invoices/new/productCode/' + this.productCode + '/code/' + customerCode, callback);
};

module.exports = Cheddar;
