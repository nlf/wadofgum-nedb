var Joi = require('joi');
var NeDB = require('nedb');
var Promise = require('bluebird');

var internals = {};
internals.save = function () {

    var self = this;
    return self.validate()
        .then(function () {

            return self.emit('preSave', self);
        })
        .then(function () {

            self._type = self.factory.type;
            return self.factory.db.insertAsync(self);
        })
        .then(function () {

            return self.validate();
        })
        .then(function () {

            return self.emit('postSave', self);
        });
};

internals.remove = function () {

    var self = this;
    return self.emit('preRemove', self)
        .then(function () {

            return self.factory.db.removeAsync({ _type: self.factory.type, _id: self.id });
        })
        .then(function () {

            return self.emit('postRemove', self);
        });
};

internals.count = function (query) {

    query = query || {};
    query._type = this.type;
    return this.db.countAsync(query);
};

internals.find = function (query) {

    var self = this;
    query = query || {};
    query._type = self.type;

    return self.db.findAsync(query)
        .then(function (models) {

            return models.map(function (model) {

                return new self(model);
            });
        });
};

internals.get = function (id) {

    var self = this;
    return self.db.findOneAsync({ _type: self.type, _id: id })
        .then(function (model) {

            if (!model) {
                return Promise.reject(new Error('not found'));
            }

            return new self(model).validate();
        });
};

internals.updateAll = function (query, update, options) {

    if (arguments.length === 1) {
        update = query;
        query = {};
    }

    options = options || {};
    query._type = this.type;
    return this.db.updateAsync(query, update, options);
};

internals.update = function (update, options) {

    options = options || {};
    var self = this;
    return self.factory.db.updateAsync({ _id: self.id, _type: self.factory.type }, update, options)
        .then(function () {

            return self.factory.db.findOneAsync({ _id: self.id, _type: self.factory.type });
        })
        .then(function (model) {

            return new self.factory(model).validate();
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

    model.db = Promise.promisifyAll(options.db);
    model.count = internals.count;
    model.find = internals.find;
    model.get = internals.get;
    model.update = internals.updateAll;

    model.prototype.save = internals.save;
    model.prototype.update = internals.update;
    model.prototype.remove = internals.remove;

    options.db.ensureIndex({ fieldName: 'type', sparse: true });
};
