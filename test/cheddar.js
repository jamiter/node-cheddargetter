var fs = require("fs");
var async = require("async");
var Cheddar = require("../lib/cheddar");

var config = {};

try {
	var json = require("../config.json");

	for (var key in json) {
		if (json.hasOwnProperty(key)) {
			config[key] = json[key];
		}
	}
} catch (error) {
	console.log("Error: " + error);
	process.exit();
}

module.exports = {};

module.exports.Plans = function (test) {
	var cheddar = new Cheddar(config.email, config.pass, config.productCode);
	async.waterfall([function (cb) {
		cheddar.getAllPricingPlans(cb);
	}, function (result, cb) {
		test.equal(typeof(result),"object", "getAllPricingPlans should return a plan array");
		test.ok(result.length > 0, "There should be more than 0 plans");

		cheddar.getPricingPlan(result[0].code, cb);
	}, function (result, cb) {
		test.equal(typeof(result), "object", "getPricingPlan should return a plan object");

		cb();
	}], function (err) {
		test.ifError(err);
		test.done();
	});
};

module.exports.PlanError = function (test) {
	var cheddar = new Cheddar(config.email, config.pass, config.productCode);

	cheddar.getPricingPlan("Bad Plan Code", function (err, customer) {
		test.notEqual(err, null);
		test.equal(customer, null);
		test.done();
	});
};

module.exports.Customers = function (test) {
	var cheddar = new Cheddar(config.email, config.pass, config.productCode);
	async.waterfall([function (cb) {
		cheddar.createCustomer({
			code: "test",
			firstName: "FName",
			lastName: "LName",
			email: "test@test.com",
			subscription: {
				planCode: config.planCode,
				method: "cc",
				ccNumber: "4111111111111111",
				ccExpiration: "12/2020",
				ccCardCode: "123",
				ccFirstName: "FName",
				ccLastName:"LName",
				ccZip: "95123"
			}
		}, cb);
	}, function (result, cb) {
		cheddar.createCustomer({
			code: "test1",
			firstName: "FName2",
			lastName: "LName2",
			email: "test2@test.com",
			subscription: {
				planCode: config.planCode,
				method: "cc",
				ccNumber: "4111111111111111",
				ccExpiration: "12/2020",
				ccCardCode: "123",
				ccFirstName: "FName2",
				ccLastName:"LName2",
				ccZip: "95123"
			}
		}, cb);
	}, function (result, cb) {
		var options = {
			planCode: [config.planCode],
			subscriptionStatus: 'activeOnly',
			orderBy: "createdDatetime",
			orderByDirection: "desc",
			createdAfterDate: "2015-01-01"
		};

		cheddar.getAllCustomers(options, cb);
	}, function (result, cb) {
		test.equal(typeof(result), "object", "getAllCustomers should return a customer array");
		test.equal(result[0].code, "test1", "first customer should be 'test'");

		cheddar.getCustomer("test", cb);
	}, function (result, cb) {
		test.equal(typeof(result), "object", "getCustomer should return a customer object");
		cb();
	}], function (err) {
		test.ifError(err);
		test.done();
	});
};

module.exports.CustomerError = function (test) {
	var cheddar = new Cheddar(config.email, config.pass, config.productCode);

	cheddar.getCustomer("Bad Customer Code", function (err, customer) {
		test.notEqual(err, null);
		test.equal(customer, null);
		test.done();
	});
};

module.exports.Items = function (test) {
	var cheddar = new Cheddar(config.email, config.pass, config.productCode);

	async.waterfall([function (cb) {
		cheddar.setItemQuantity("test", config.itemCode, 1, cb);
	}, function (result, cb) {
		cheddar.getCustomer("test", cb);
	}, function (result, cb) {
		test.equal(result.subscriptions[0].items[0].quantity, 1);
		cb(null, {});
	}, function (result, cb) {
		cheddar.addItem("test", config.itemCode, 2, cb);
	}, function (result, cb) {
		cheddar.getCustomer("test", cb);
	}, function (result, cb) {
		test.equal(result.subscriptions[0].items[0].quantity, 1 + 2);
		cb(null, {});
	}, function (result, cb) {
		cheddar.addItem("test", config.itemCode, cb);
	}, function (result, cb) {
		cheddar.getCustomer("test", cb);
	}, function (result, cb) {
		test.equal(result.subscriptions[0].items[0].quantity, 1 + 2 + 1);
		cb(null, {});
	}, function (result, cb) {
		cheddar.removeItem("test", config.itemCode, 2, cb);
	}, function (result, cb) {
		cheddar.getCustomer("test", cb);
	}, function (result, cb) {
		test.equal(result.subscriptions[0].items[0].quantity, 1 + 2 + 1 - 2);
		cb(null, {});
	}, function (result, cb) {
		cheddar.removeItem("test", config.itemCode, cb);
	}, function (result, cb) {
		cheddar.getCustomer("test", cb);
	}, function (result, cb) {
		test.equal(result.subscriptions[0].items[0].quantity, 1 + 2 + 1 - 2 - 1);
		cb(null, {});
	}], function (err) {
		test.ifError(err);
		test.done();
	});
};

module.exports.CustomerDeletion = function (test) {
	var cheddar = new Cheddar(config.email, config.pass, config.productCode);

	async.waterfall([function (cb) {
		cheddar.deleteCustomer("test", cb);
	}, function (result, cb) {
		cheddar.deleteCustomer("test1", cb);
	}], function (err) {
		test.ifError(err);
		test.done();
	});
};
