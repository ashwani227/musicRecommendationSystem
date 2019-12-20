//Packages required
//Express package
var express = require('express')
	app = express();
//Encryption package
const Cryptr = require('cryptr');
const cryptr = new Cryptr('myTotalySecretKey');
//Session and cookie management
var session = require('express-session');
var sess;

//Setting route for accessing local folder files on server
app.set("view engine","ejs");
app.use('/css',express.static('css'));
app.use('/views',express.static('views'));
app.use('/images',express.static('images'));
app.use('/js',express.static('js'));
app.use('/vendor',express.static('vendor'));
 app.use(session({secret: 'ssshhhhh'}));

//Initiating Postgres object for database
const { Pool} = require('pg')

//Setting up connection for Postgres
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'postgres',
  password: '1234',
  port: 5433,
})

//Default route
app.get("/",function(req,res){
	res.render("index")
})

//Signup route for the new user
app.get("/signup",function(req,res){
	//Initialising variables sent from html file through GET method
	var userid = req.query.uid;
	sess = req.session;
	sess.userid = req.query.uid;
	var name = req.query.name;
	var birthday = req.query.birthday;
	var gender = req.query.gender;
	var country = req.query.country;
	sess.country = country;
	sess.age = Number(birthday);
	sess.gender = gender;
	var password = req.query.password;
	//Encrypting password before sending it to database
	password = cryptr.encrypt(password)
	//Query for Insert into database with the fields mentioned
	pool.query('INSERT INTO public.login(name,birthdate,gender,country,password,userid) VALUES($1,$2,$3,$4,$5,$6)',[name,birthday,gender,country,password,userid],function(err,res)
	{
	console.log(err);
	}) 
	//Initial choices filtered by the country
	pool.query('SELECT distinct artistname FROM public.music WHERE country=$1',[country],function(err1,res1)
			{
				var startingChoices = res1.rows;
				//There are no previous choices stored for a new user
				previousC = []
				//Rendering to page1 where user will select artists from available choices
				res.render("page1",{startingChoices:startingChoices,previousC:previousC})
			})


})

//Route for existing user to sign in to the account
app.get("/signin",function(req,response){
	var login = false;
	//Gathering userid and password information
	var userid= req.query.uid;
	var password = req.query.password;
	//Select record from database corresponding to unique userid provided
	pool.query('SELECT * FROM public.login WHERE userid =$1',[userid],function (err,result){
		//Collecting the result from the query in different variables
		var encryptedPass = result.rows[0].password;
		var country = result.rows[0].country;
		var age = result.rows[0].birthdate;
		var gender = result.rows[0].gender;

		//Decrypting the password fetched from database
		var decryptedPass = cryptr.decrypt(encryptedPass);
		// console.log(decryptedPass)
		//If username and password matches
		if(decryptedPass == password){
			//Initiate session and save values to be used in whole session
			sess = req.session;
			sess.userid = req.query.uid;
			sess.country = country;
			sess.age = Number(age);
			sess.gender = gender;
			console.log(sess.userid);
			login = true;
			var choices=[];
			//Select previous choices saved by the user from the database
			pool.query('SELECT firstchoices from public.login where userid=$1',[sess.userid],function(error,respo){
				console.log(respo)
			choices = respo.rows[0].firstchoices;
			console.log(typeof sess.age)
			var age1 = Number(sess.age) + 4;
			var age2 = Number(sess.age) - 4;
			var gender = sess.gender;
			console.log(age1)
			console.log(choices)
	//Filtering out similar users based on the age,country and similarity index between 2 users
	pool.query('SELECT i.userid,i.artistnames,i.plays, x.ct,array_length(i.artistnames,1) FROM  public.music1 i, LATERAL (SELECT count(*) AS ct FROM unnest(i.artistnames) uid WHERE  uid = ANY($1::text[])) x where x.ct>0 and age<$2 and age>$3 and gender=$4 ORDER  BY x.ct DESC,array_length LIMIT 5',[choices,age1,age2,gender],function(err,res)
	{
		// console.log(res)
		var player = []
		var users =[]
		var t = res.rows;
		var l = 0;
		console.log(t.length)
		for(var i=0;i< t.length; i++)
		{ 
			//Choose most played artist from the similar users
			//Using 5 most similar users from the database
			pool.query('SELECT artistname from public.music where userid = $1 order by plays DESC LIMIT 5',[t[i].userid],function(err2,res2){
				for(var k=0;k<5;k++)
				{
					if((!player.includes(res2.rows[k].artistname)&&!choices.includes(res2.rows[k].artistname))){
						player.push(res2.rows[k].artistname)
						}
						l=l+1;
				}
				console.log(l)
		if(l==(t.length*5))
		{
		//Rendering to recommended page with player object as recommendations and choices as user choices.
		response.render("recommended",{res:player,choices:choices})
		}

		})
		}
		console.log(err)
		});
		
		} )
		}
		else{
			//If username and password are wrong
			response.send("Failed attempt")

		}
	})
})
//Recommendation logic after inputting favourite artists
app.get("/firstchoices",function (req,res1) {
	var choices =[]
	//Choices filled by the user
	var c = req.query.initial;
	//Wildness Factor or type of recommendations user wants either more accurate or more versatile
	var wildness = req.query.wildness;
	//If user entered any new artists in the playlist
	if(c!=""){
	var cc = c.split(',');
	console.log(cc)
	//Updating table with new artists and appending to previous list
	pool.query('UPDATE public.login SET firstchoices=array_cat(firstchoices,$1) WHERE userid= $2',[cc,sess.userid],function(err,res1){
		console.log(err);
	
	
})
	}
	//Fetching latest playlist items from database
	pool.query('SELECT firstchoices from public.login where userid=$1',[sess.userid],function(er,re){
		choices = re.rows[0].firstchoices;
	
	// console.log(sess.userid)
	// console.log(age1)
	// console.log(sess.country)
	// console.log(typeof wildness)
	// console.log(choices);

	//If user wants accurate recommendations
	if(wildness==1){
	var age1 = Number(sess.age) + 4;
	var age2 = Number(sess.age) - 4;
	var gender = sess.gender;
	//Filtering out similar users based on the age,country and similarity index between 2 users
	pool.query('SELECT i.userid,i.artistnames,i.plays, x.ct,array_length(i.artistnames,1) FROM  public.music1 i, LATERAL (SELECT count(*) AS ct FROM unnest(i.artistnames) uid WHERE  uid = ANY($1::text[])) x where x.ct>0 and age<$2 and age>$3 and gender=$4 and country=$5 ORDER  BY x.ct DESC,array_length LIMIT 5',[choices,age1,age2,gender,sess.country],function(err,res)
	{
		var player = []
		var users =[]
		var t = res.rows;
		var l = 0;
		for(var i=0;i< t.length; i++)
		{ 
			//Getting 5 most played artists for each userid that was fetched
			pool.query('SELECT artistname from public.music where userid = $1 order by plays DESC LIMIT 5',[t[i].userid],function(err2,res2){
				for(var k=0;k<5;k++)
				{	
					//Appending distinct recommendations to the list
					if((!player.includes(res2.rows[k].artistname)&&!choices.includes(res2.rows[k].artistname))){
						player.push(res2.rows[k].artistname)
						}
						l=l+1;
				}
				console.log(l)
		if(l==(t.length*5))
		{
			//Rendering to recommendation page
		res1.render("recommended",{res:player,choices:choices})
		}

		})
		}
		console.log(err)
		});
		}
	//If user wants more diverse recommendations
	else if(wildness==2){
	//Changing the age bracket
	var age1 = Number(sess.age) + 8;
	var age2 = Number(sess.age) - 8;
	var gender = sess.gender;	
	var country_list = []
	//Defining group of countries which listen to similar kind of music
	var arr1 = ['Canada','United States','United Kingdom','Austria','Australia','New Zealand','Israel','Monaco','Netherlands']
	var arr2 = ['China','Hong Kong','Philippines','Japan','Singapore','Thailand']
	var arr3 = ['Egypt','Syria','Iraq','Iran,Islamic Republic of','Qatar','Georgia','United Arab Emirates','Turkey']
	var arr4 = ['India','Pakistan','Bangladesh','Sri Lanka','Nepal']
	var arr5 = ['Germany','France','Italy','Latvia','Denmark']
	//If user's country belongs to any sub-list then country_list variable will be populated
	if(arr1.includes(sess.country)){
		country_list = arr1
	}
	else if(arr2.includes(sess.country)){
		country_list = arr2
	}
	else if(arr3.includes(sess.country)){
		country_list = arr3
	}
	else if(arr4.includes(sess.country)){
		country_list = arr4
	}
	else if(arr5.includes(sess.country)){
		country_list = arr5
	}
	console.log(country_list)
	//Fetching latest choices of playlist from the database
	pool.query('SELECT firstchoices from public.login where userid=$1',[sess.userid],function(er,re){
		var choices = re.rows[0].firstchoices;
	})
	//Filtering out similar users based on the age,country and similarity index between 2 users
	pool.query('SELECT i.userid,i.artistnames,i.plays, x.ct,array_length(i.artistnames,1) FROM   public.music1 i, LATERAL (SELECT count(*) AS ct FROM unnest(i.artistnames) uid WHERE  uid = ANY($1::text[]) ) x where x.ct>0 and age<$2 and age>$3 and gender=$4 and i.country = ANY($5::text[]) ORDER  BY x.ct DESC,array_length LIMIT 5',[choices,age1,age2,gender,country_list],function(err,res)
	{
		var player = []
		var users =[]
		var t = res.rows;
		console.log(res);
		var l = 0;
		for(var i=0;i< t.length; i++)
		{ 
			//Getting 5 most played artists for each userid that was fetched
			pool.query('SELECT artistname from public.music where userid = $1 order by plays DESC LIMIT 5',[t[i].userid],function(err2,res2){
				for(var k=0;k<5;k++)
				{	
					//Adding distinct recommendations to the list
					if((!player.includes(res2.rows[k].artistname)&&!choices.includes(res2.rows[k].artistname))){
						player.push(res2.rows[k].artistname)
						}
						l=l+1;
				}
				console.log(l)
		if(l==(t.length*5))
		{
		//Rendering to recommendation page
		res1.render("recommended",{res:player,choices:choices})
		}

		})
		}
		console.log(err)
		});
	}
	else if(wildness==3){
	//Changing the age bracket
	var age1 = Number(sess.age) + 8;
	var age2 = Number(sess.age) - 8;
	var gender = sess.gender;	
	var country_list = []
	
	//Fetching latest choices of playlist from the database
	pool.query('SELECT firstchoices from public.login where userid=$1',[sess.userid],function(er,re){
		var choices = re.rows[0].firstchoices;
	})
	//Filtering out similar users based on the age,country and similarity index between 2 users
	pool.query('SELECT i.userid,i.artistnames,i.plays, x.ct,array_length(i.artistnames,1) FROM   public.music1 i, LATERAL (SELECT count(*) AS ct FROM unnest(i.artistnames) uid WHERE  uid = ANY($1::text[]) ) x where x.ct>0 and age<$2 and age>$3 and gender=$4 LIMIT 5',[choices,age1,age2,gender],function(err,res)
	{
		var player = []
		var users =[]
		var t = res.rows;
		console.log(res);
		var l = 0;
		for(var i=0;i< t.length; i++)
		{ 
			//Getting 5 most played artists for each userid that was fetched
			pool.query('SELECT artistname from public.music where userid = $1 order by plays DESC LIMIT 5',[t[i].userid],function(err2,res2){
				for(var k=0;k<5;k++)
				{	
					//Adding distinct recommendations to the list
					if((!player.includes(res2.rows[k].artistname)&&!choices.includes(res2.rows[k].artistname))){
						player.push(res2.rows[k].artistname)
						}
						l=l+1;
				}
				console.log(l)
		if(l==(t.length*5))
		{
		//Rendering to recommendation page
		res1.render("recommended",{res:player,choices:choices})
		}

		})
		}
		console.log(err)
		});
	}
})
	
	
})

//Page Rendering Routes
//Already have account or login route
app.get("/login",function(req,res){
	res.render('login')
})
//Switching route for new account
app.get("/index",function(req,res) {
	res.render('index')
})
//Logout route and clearing the session.
app.get("/logout",function(req,res){
	sess = "";
	res.render('index')
})
//Edit choices route
//Previous choices and user can append new items in custom playlist
app.get("/editchoices",function(req,res) {
	pool.query('SELECT firstchoices from public.login where userid=$1',[sess.userid],function(erro,reso){
		var previousC = reso.rows[0].firstchoices;
		console.log(reso.rows[0].firstchoices)
	pool.query('SELECT distinct artistname FROM public.music WHERE country=$1',[sess.country],function(err1,res1){
	console.log(err1);
				var startingChoices = res1.rows;
							res.render("page1",{startingChoices:startingChoices,previousC:previousC})

			})
})
})
//Server listening port address
var server = app.listen(3200, function() {
    console.log('Ready on port %d', server.address().port);
});