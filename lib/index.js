var Joi = require('joi');
var NeDB = require('nedb');

var internals = {};
internals._emit = function (event, arg, fail, success) {

    this.emit(event, arg, function (err) {

        if (err) {
            return fail(err);
        }

        success();
    });
};

internals._validate = function (fail, success) {

    this.validate(function (err) {

        if (err) {
            return fail(err);
        }

        success();
    });
};

internals.save = function (callback) {

    var self = this;
    internals._validate.call(self, callback, function () {

        internals._emit.call(self, 'preSave', self, callback, function () {

            self._type = self.factory.type;
            self.factory.db.insert(self, function (err) {

                internals._validate.call(self, callback, function () {

                    internals._emit.call(self, 'postSave', self, callback, function () {

                        callback(err);
                    });
                });
            });
        });
    });
};

internals.remove = function (callback) {

    var self = this;
    internals._emit.call(self, 'preRemove', self, callback, function () {
        self.factory.db.remove({ _type: self.factory.type, _id: self.id }, function (err) {

            internals._emit.call(self, 'postRemove', self, callback, function () {

                callback(err);
            });
        });
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

internals.updateAll = function (query, update, options, callback) {

    if (typeof options === 'function') {
        callback = options;
        options = {};
    }

    query._type = this.type;
    this.db.update(query, update, options, callback);
};

internals.update = function (update, options, callback) {

    if (typeof options === 'function') {
        callback = options;
        options = {};
    }

    var self = this;
    this.factory.db.update({ _id: this.id, _type: this.factory.type }, update, options, function (err) {

        if (err) {
            return callback(err);
        }

        self.factory.db.findOne({ _id: self.id, _type: self.factory.type }, function (err, model) {

            callback(err, new self.factory(model));
        });
    });
};

exports.register = function (model, options) {

    Joi.assert(options, {
        db: Joi.object().type(NeDB)
    }, 'Invalid options');

    model.schema = Joi.object({
        _id: Joi.string(),
        _type: Joi.strip()
    }).rename('_id', 'id');

    model.db = options.db;
    model.count = internals.count;
    model.find = internals.find;
    model.get = internals.get;
    model.update = internals.updateAll;

    model.prototype.save = internals.save;
    model.prototype.update = internals.update;
    model.prototype.remove = internals.remove;

    options.db.ensureIndex({ fieldName: 'type', sparse: true });
};
