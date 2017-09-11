var https = require("https");
var qs = require("qs");
var xml2js = require("xml2js");
var concat = require("concat-stream");

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

cheddar.prototype.callAPI = function (data, path, callback) {
	if (typeof(path) == "function") {
		callback = path;
		path = data;
		data = null;
	}

	// Encode the path, because some codes can contain spaces
	path = encodeURI(path);

	var config = {
		host: getHost(),
		port: getPort(),
		headers: {authorization: this.auth},
		path: "/xml" + path,
		method: "POST"
	};

	if (data) {
		data = qs.stringify(data);

		config.headers["Content-Type"] = "application/x-www-form-urlencoded";
		config.headers["Content-Length"] = data.length;
	}

	var req = https.request(config, function (res) {
		var failed = false;

		// Handle response error
		res.on('error', function (err) {
			// Mark this request as failed so it does not handle any incoming data
			var failed = true;
			return callback(err);
		});

		res.pipe(concat(function (data) {
			if (failed) {
				return;
			}

			var parseOptions = {
				explicitRoot: true,
				explicitArray: false,
				validator: validator,
				emptyTag: null,
				mergeAttrs: true
			};

			var xml = new xml2js.Parser(parseOptions);

			xml.parseString(data, function (err, xml) {
				// Handle error
				if (err) {
					return callback(err);
				}
				// Handle empty xml
				else if (!xml) {
					return callback(null, null);
				}

				var type = Object.keys(xml)[0];

				if (type == "error") {
					var error = new Error(xml[type]._);
					error.code = +xml[type].code;
					callback(error);
				} else {
					callback(null, xml[type]);
				}
			});
		}));
	});

	req.on("error", function (err) {
		callback(err, null);
	});

	if (data) {
		req.write(data);
	}

	req.end();
};

cheddar.prototype.getAllPricingPlans = function (callback) {
	this.callAPI("/plans/get/productCode/" + this.productCode, callback);
};

cheddar.prototype.getPricingPlan = function (code, callback) {
	this.callAPI("/plans/get/productCode/" + this.productCode + "/code/" + code, function (err, plans) {
		if (err) {
			callback(err);
		} else {
			// Return the first plan (it should only contain 1)
			callback(null, plans[0]);
		}
	});
};

cheddar.prototype.getAllCustomers = function (data, callback) {
	if (!callback && typeof(data) == "function") {
		callback = data;
		data = null;
	}
	this.callAPI(data, "/customers/get/productCode/" + this.productCode, callback);
};

cheddar.prototype.getCustomer = function (code, callback) {
	this.callAPI("/customers/get/productCode/" + this.productCode + "/code/" + code, function (err, customers) {
		if (err) {
			callback(err);
		} else if (!customers || !customers.length) {
			callback(new Error('No customers could be retrieved'));
		} else {
			// Return the first customer (it should only contain 1)
			callback(null, customers[0]);
		}
	});
};

cheddar.prototype.createCustomer = function (data, callback) {
	this.callAPI(data, "/customers/new/productCode/" + this.productCode, callback);
};

cheddar.prototype.editCustomerAndSubscription = function (code, data, callback) {
	this.callAPI(data, "/customers/edit/productCode/" + this.productCode + "/code/" + code, callback);
};
cheddar.prototype.updateCustomerAndSubscription = cheddar.prototype.editCustomerAndSubscription;

cheddar.prototype.editCustomer = function (code, data, callback) {
	this.callAPI(data, "/customers/edit-customer/productCode/" + this.productCode + "/code/" + code, callback);
};
cheddar.prototype.updateCustomer = cheddar.prototype.editCustomer;

cheddar.prototype.editSubscription = function (code, data, callback) {
	this.callAPI(data, "/customers/edit-subscription/productCode/" + this.productCode + "/code/" + code, callback);
};
cheddar.prototype.updateSubscription = cheddar.prototype.editSubscription;

cheddar.prototype.deleteCustomer = function (code, callback) {
	this.callAPI("/customers/delete/productCode/" + this.productCode + "/code/" + code, callback);
};

cheddar.prototype.cancelSubscription = function (code, callback) {
	this.callAPI("/customers/cancel/productCode/" + this.productCode + "/code/" + code, callback);
};

cheddar.prototype.addItem = function (code, itemCode, amount, callback) {
	if (!callback && typeof(amount) == "function") {
		callback = amount;
		amount = null;
	}

	if (amount) {
		amount = {quantity: amount.toString()};
	}

	this.callAPI(amount, "/customers/add-item-quantity/productCode/" + this.productCode + "/code/" + code + "/itemCode/" + itemCode, callback);
};

cheddar.prototype.removeItem = function (code, itemCode, amount, callback) {
	if (!callback && typeof(amount) == "function") {
		callback = amount;
		amount = null;
	}

	if (amount) {
		amount = {quantity: amount.toString()};
	}

	this.callAPI(amount, "/customers/remove-item-quantity/productCode/" + this.productCode + "/code/" + code + "/itemCode/" + itemCode, callback);
};

cheddar.prototype.setItemQuantity = function (code, itemCode, amount, callback) {
	var data = {quantity: amount.toString()};
	this.callAPI(data, "/customers/set-item-quantity/productCode/" + this.productCode + "/code/" + code + "/itemCode/" + itemCode, callback);
};

cheddar.prototype.addCustomCharge = function (code, chargeCode, quantity, amount, description, callback) {
	var data = {
		chargeCode: chargeCode,
		quantity: quantity.toString(),
		eachAmount: amount.toString(),
		description: description
	};

	this.callAPI(data, "/customers/add-charge/productCode/" + this.productCode + "/code/" + code, callback);
};

cheddar.prototype.deleteCustomCharge = function (code, chargeId, callback) {
	var data = {chargeId: chargeId};
	this.callAPI(data, "/customers/delete-charge/productCode/" + this.productCode + "/code/" + code, callback);
};

cheddar.prototype.resendInvoiceEmail = function (idOrNumber, callback) {
	var data;

	if (isNaN(idOrNumber)) {
		data = {id: idOrNumber};
	} else {
		data = {number: idOrNumber};
	}

	this.callAPI(data, "/invoices/send-email/productCode/" + this.productCode, callback);
};

cheddar.prototype.oneTimeInvoice = function (customerCode, data, callback) {
	this.callAPI(data, "/invoices/new/productCode/" + this.productCode + "/code/" + customerCode, callback);
};

module.exports = cheddar;
