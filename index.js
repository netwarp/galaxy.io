const express = require('express')
const app = express()
const bodyParser = require('body-parser')
const port = 8080
const  nunjucks = require('nunjucks')

require('dotenv').config()

const passport = require('passport')
const session = require('express-session')
const GithubStrategy = require('passport-github').Strategy


const FrontController = require('./controllers/FrontController')
const RepositoriesController = require('./controllers/Api/RepositoriesController')
const ContractsController = require('./controllers/Api/ContractsController')
const ensureAuthenticated = require('./middleware/ensureAuthenticated')

nunjucks.configure('views', {
	autoescape:  true,
	express:  app,
	watch: true,
})


const User = require('./models/User')

passport.use(
	new GithubStrategy(
		{
			clientID: process.env.clientID,
			clientSecret: process.env.clientSecret,
			callbackUrl: 'http://localhost:8080/login/github/callback'
		},
		(accessToken, refreshToken, profile, done) => {
			return done(null, profile)
		}
	)
)

app.use(express.static('public'))
app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())

app.use(session({
	secret: process.env.session,
	proxy: true,
	resave: true,
	saveUninitialized: true
}))

app.use(passport.initialize())
app.use(passport.session())

passport.serializeUser(async (user, done) => {

	const u = await User.findByPk(user.id)
	if (u === null) {

		const data = {
			id: user.id,
			username: user.username,
			avatar_url: user['_json']['avatar_url'],
			provider: user.provider
		}

		await User.create(data)
	}

	await console.log(user)
	await done(null, user)
})

passport.deserializeUser((user, done) =>  done(null, user) )

app.get('/', FrontController.index)

app.get('/get-started', FrontController.getStarted)

app.get('/search', FrontController.search)

app.get('/contract/:id', FrontController.contract)

app.get('/user/:username', FrontController.user)

app.get('/login', FrontController.login)

app.get('/login/github', passport.authenticate('github'))

app.get('/login/github/callback', passport.authenticate('github', { failureRedirect: '/nope' }),
	(request, response) => {
		response.redirect('/app')
	}
)

app.get('/play', FrontController.play)

app.get('/app', ensureAuthenticated, (request, response) => {

	let data = {
		user: request.user
	}

	console.log('--------')

	response.render('app.html', data)
})

app.get('/logout', FrontController.logout)

app.get('/api/repositories', RepositoriesController.index)
app.post('/api/repositories', RepositoriesController.store)
app.get('/api/repositories/:id', RepositoriesController.show)
app.put('/api/repositories/:id', RepositoriesController.update)
app.delete('/api/repositories/:id', RepositoriesController.destroy)

app.get('/api/contracts', ContractsController.all)
app.post('/api/contracts', ContractsController.store)
app.get('/api/contracts/:id', ContractsController.show)

app.get('/test', RepositoriesController.home)

app.use((request, response) => {
	if (request.user) {
		return response.redirect('/app')
	}

	return response.redirect('/')
})

app.listen(port, () => console.log(`http://localhost:${port}`))
