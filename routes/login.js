var express = require('express');
var bcrypt = require('bcryptjs');
var jwt = require('jsonwebtoken');

var SEED = require('../config/config').SEED;

var app = express();

var Usuario = require('../models/usuario');

// Google
const { OAuth2Client } = require('google-auth-library');
var GOOGLE_CLIENT_ID = require('../config/config').CLIENT_ID;
var GOOGLE_SECRET = require('../config/config').GOOGLE_SECRET;
const client = new OAuth2Client(GOOGLE_CLIENT_ID, GOOGLE_SECRET);

//===================================================================
// Login Google
//===================================================================

app.post('/google', async(req, res) => {
    var token = req.body.token || '';

    const ticket = await client
        .verifyIdToken({
            idToken: token,
            audience: GOOGLE_CLIENT_ID
        })
        .catch((e) => {
            return res.status(403).json({
                ok: false,
                mensaje: 'Token no válido',
                err: e
            });
        });

    const googleUser = ticket.getPayload();

    Usuario.findOne({ email: googleUser.email }, (err, usuarioDB) => {
        if (err) {
            return res.status(500).json({
                ok: false,
                err
            });
        }
        if (usuarioDB) {
            if (usuarioDB.google === false) {
                return res.status(400).json({
                    ok: false,
                    err: {
                        message: 'Debe de usar su autenticación normal'
                    }
                });
            } else {
                console.log('No existe usuario');

                let token = jwt.sign({ usuario: usuarioDB }, SEED, { expiresIn: 14400 });
                return res.json({
                    ok: true,
                    usuario: usuarioDB,
                    token: token,
                    id: usuarioDB._id
                });
            }
        } else {
            // Si el usuario no existe en nuestra base de datos

            let usuario = new Usuario();
            usuario.nombre = googleUser.name;
            usuario.email = googleUser.email;
            usuario.img = googleUser.picture;
            usuario.google = true;
            usuario.password = ':)';
            usuario.save((err, usuarioDB) => {
                if (err) {
                    return res.status(500).json({
                        ok: false,
                        err
                    });
                }
                let token = jwt.sign({ usuario: usuarioDB }, SEED, { expiresIn: 14400 });
                //var token = jwt.sign({ usuario: usuarioBD }, SEED, { expiresIn: 14400 }); // 4 horas

                return res.json({
                    ok: true,
                    usuario: usuarioDB,
                    token: token,
                    id: usuarioDB._id
                });
            });
        }
    });
});

//===================================================================
// Login Normal
//===================================================================
app.post('/', (req, res) => {
    var body = req.body;
    Usuario.findOne({ email: body.email }, (err, usuarioDB) => {
        if (err) {
            return res.status(500).json({
                ok: false,
                mensaje: 'Error al buscar usuario',
                errors: err
            });
        }
        if (!usuarioDB) {
            return res.status(400).json({
                ok: false,
                mensaje: 'Credenciales incorrectas - email',
                errors: err
            });
        }
        if (!bcrypt.compareSync(body.password, usuarioDB.password)) {
            return res.status(400).json({
                ok: false,
                mensaje: 'Credenciales incorrectas - password',
                errors: err
            });
        }

        // Crear un token!!
        usuarioDB.password = ':)';
        var token = jwt.sign({ usuario: usuarioDB }, SEED, { expiresIn: 14400 }); // 4 horas
        res.status(200).json({
            ok: true,
            usuario: usuarioDB,
            token: token,
            id: usuarioDB.id
        });
    });
});

module.exports = app;