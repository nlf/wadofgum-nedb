var Joi = require('joi');
var NeDB = require('nedb');

var internals = {};
internals.save = function (callback) {

    var self = this;
    self.validate(function (err) {

        if (err) {
            return callback(err);
        }

        self._type = self.factory.type;
        self.factory.db.insert(self, function (err) {

            self.validate();
            callback(err);
        });
    });
};

internals.remove = function (callback) {

    this.factory.db.remove({ _type: this.factory.type, _id: this.id }, function (err) {

        callback(err);
    });
};

internals.count = function (query, callback) {

    if (typeof query === 'function') {
        callback = query;
        query = {};
    }

    query._type = this.type;
    this.db.count(query, callback);
};

internals.find = function (query, callback) {

    if (typeof query === 'function') {
        callback = query;
        query = {};
    }

    var self = this;
    query._type = self.type;
    self.db.find(query, function (err, models) {

        callback(err, [].concat(models).map(function (model) {

            return new self(model);
        }));
    });
};

internals.get = function (id, callback) {

    var self = this;
    self.db.findOne({ _type: self.type, _id: id }, function (err, model) {

        if (!model &&
           !err) {

            err = new Error('not found');
        }

        callback(err, model ? new self(model) : undefined);
    });
};

exports.register = function (model, options) {

    Joi.assert(options || {}, {
        db: Joi.object().type(NeDB)
    }, 'Invalid options');

    model.extendSchema(Joi.object({
        _id: Joi.string(),
        _type: Joi.strip()
    }).rename('_id', 'id'));

    model.extend({
        db: options.db,
        count: internals.count,
        find: internals.find,
        get: internals.get
    });

    model.prototype.extend({
        save: internals.save,
        remove: internals.remove
    });

    options.db.ensureIndex({ fieldName: 'type', sparse: true });
};
