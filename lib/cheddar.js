var xml2js = require("xml2js");
var rp = require("request-promise-native");

var cheddar = function (user, pass, productCode) {
	this.auth = "Basic " + new Buffer(user + ":" + pass).toString("base64");
	this.pass = pass;
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
	'promotions'
];

var validator = function (xpath, currentValue, newValue) {
	// Empty values should be null
	if(!newValue) {
		return null;
	}

	// Parse integers
	if(!isNaN(newValue)) {
		return +newValue;
	}

	var paths = xpath.split('/');
	var item = paths[paths.length-1];

	if (arrays.indexOf(item) === -1) {
		return newValue;
	} else {
		// Slice of the 's'
		var child = item.slice(0, item.length-1);

		// Make sure the child is an array using the concat function
		return [].concat(newValue[child]);
	}
};

var getHost = function () {
	return process.env.CHEDDAR_HOST || process.env.CHEDDARGETTER_HOST || "getcheddar.com";
}

var getPort = function () {
	return process.env.CHEDDAR_PORT || process.env.CHEDDARGETTER_PORT || 443;
}

var xmlParseOptions = {
	explicitRoot: true,
	explicitArray: false,
	validator: validator,
	emptyTag: null,
	mergeAttrs: true
};

var parseResult = function (data) {
	return new Promise(function (resolve, reject) {
		var xml = new xml2js.Parser(xmlParseOptions);

		xml.parseString(data, function (err, xml) {
			// Handle error
			if (err) {
				return reject(err);
			}
			// Handle empty xml
			else if (!xml) {
				return resolve(null);
			}

			var type = Object.keys(xml)[0];

			if (type == "error") {
				var error = new Error(xml[type]._);
				error.code = +xml[type].code;
				reject(error);
			} else {
				resolve(xml[type]);
			}
		});
	});
}

var handleCallback = function(callback, promise) {
	callback && promise
	.then(function (data) {
		callback(null, data);
	})
	.catch(function (err) {
		callback(err);
	});
}

cheddar.prototype.callAPI = function (data, path, callback) {
	if (typeof path == "function") {
		callback = path;
		path = data;
		data = null;
	} else if (typeof data == "string") {
		path = data;
		data = null;
	}

	// Encode the path, because some codes can contain spaces
	path = encodeURI(path);

	var requestOptions = {
		uri: 'https://' + getHost() + ':' + getPort() + "/xml" + path,
		headers: {
			authorization: this.auth
		},
		form: data
	};

	var promise = rp.post(requestOptions)
	.then(parseResult)
	.catch(function (err) {
		if (err.error && err.error.indexOf('<?xml') === 0) {
			return parseResult(err.error).then(function (xml) {
				var error = new Error(xml[type]._);
				error.code = Number(xml[type].code);
				throw error;
			})
		}
		return err;
	});

	handleCallback(callback, promise);

	return promise;
};

cheddar.prototype.getAllPricingPlans = function (callback) {
	return this.callAPI("/plans/get/productCode/" + this.productCode, callback);
};

cheddar.prototype.getPricingPlan = function (code, callback) {
	const promise = this.callAPI("/plans/get/productCode/" + this.productCode + "/code/" + code)
	.then(function (plans) {
		// Return the first plan (it should only contain 1)
		return plans && plans[0];
	});

	handleCallback(callback, promise);

	return promise;
};

cheddar.prototype.getAllCustomers = function (data, callback) {
	if (!callback && typeof(data) == "function") {
		callback = data;
		data = null;
	}
	return this.callAPI(data, "/customers/get/productCode/" + this.productCode, callback);
};

cheddar.prototype.getCustomer = function (code, callback) {
	var promise = this.callAPI("/customers/get/productCode/" + this.productCode + "/code/" + code)
	.then(function (customers) {
		if (!customers || !customers.length) {
			throw new Error('No customers could be retrieved');
		}
		// Return the first customer (it should only contain 1)
		return customers[0];
	});

	handleCallback(callback, promise);

	return promise;
};

cheddar.prototype.createCustomer = function (data, callback) {
	return this.callAPI(data, "/customers/new/productCode/" + this.productCode, callback);
};

cheddar.prototype.editCustomerAndSubscription = function (code, data, callback) {
	return this.callAPI(data, "/customers/edit/productCode/" + this.productCode + "/code/" + code, callback);
};
cheddar.prototype.updateCustomerAndSubscription = cheddar.prototype.editCustomerAndSubscription;

cheddar.prototype.editCustomer = function (code, data, callback) {
	return this.callAPI(data, "/customers/edit-customer/productCode/" + this.productCode + "/code/" + code, callback);
};
cheddar.prototype.updateCustomer = cheddar.prototype.editCustomer;

cheddar.prototype.editSubscription = function (code, data, callback) {
	return this.callAPI(data, "/customers/edit-subscription/productCode/" + this.productCode + "/code/" + code, callback);
};
cheddar.prototype.updateSubscription = cheddar.prototype.editSubscription;

cheddar.prototype.deleteCustomer = function (code, callback) {
	return this.callAPI("/customers/delete/productCode/" + this.productCode + "/code/" + code, callback);
};

cheddar.prototype.cancelSubscription = function (code, callback) {
	return this.callAPI("/customers/cancel/productCode/" + this.productCode + "/code/" + code, callback);
};

cheddar.prototype.addItem = function (code, itemCode, amount, callback) {
	if (!callback && typeof(amount) == "function") {
		callback = amount;
		amount = null;
	}

	if (amount) {
		amount = {quantity: amount.toString()};
	}

	return this.callAPI(amount, "/customers/add-item-quantity/productCode/" + this.productCode + "/code/" + code + "/itemCode/" + itemCode, callback);
};

cheddar.prototype.removeItem = function (code, itemCode, amount, callback) {
	if (!callback && typeof(amount) == "function") {
		callback = amount;
		amount = null;
	}

	if (amount) {
		amount = {quantity: amount.toString()};
	}

	return this.callAPI(amount, "/customers/remove-item-quantity/productCode/" + this.productCode + "/code/" + code + "/itemCode/" + itemCode, callback);
};

cheddar.prototype.setItemQuantity = function (code, itemCode, amount, callback) {
	var data = {quantity: amount.toString()};
	return this.callAPI(data, "/customers/set-item-quantity/productCode/" + this.productCode + "/code/" + code + "/itemCode/" + itemCode, callback);
};

cheddar.prototype.addCustomCharge = function (code, chargeCode, quantity, amount, description, callback) {
	var data = {
		chargeCode: chargeCode,
		quantity: quantity.toString(),
		eachAmount: amount.toString(),
		description: description
	};

	return this.callAPI(data, "/customers/add-charge/productCode/" + this.productCode + "/code/" + code, callback);
};

cheddar.prototype.deleteCustomCharge = function (code, chargeId, callback) {
	var data = {chargeId: chargeId};
	return this.callAPI(data, "/customers/delete-charge/productCode/" + this.productCode + "/code/" + code, callback);
};

cheddar.prototype.resendInvoiceEmail = function (idOrNumber, callback) {
	var data;

	if (isNaN(idOrNumber)) {
		data = {id: idOrNumber};
	} else {
		data = {number: idOrNumber};
	}

	return this.callAPI(data, "/invoices/send-email/productCode/" + this.productCode, callback);
};

cheddar.prototype.oneTimeInvoice = function (customerCode, data, callback) {
	return this.callAPI(data, "/invoices/new/productCode/" + this.productCode + "/code/" + customerCode, callback);
};

module.exports = cheddar;
