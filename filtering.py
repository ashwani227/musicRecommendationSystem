import pandas as pd
# Getting csv file which contains all the artists and number of records were around 17 million
a = pd.read_csv("C:/Users/singl/Downloads/lastfm-dataset-360K/usersha1-artmbid-artname-plays.tsv", sep='\t');
a.columns = ["User", "Artist_id","Artist_name","plays"]

# Getting csv file which contains all the usernames
#Number of records = 360,000
b = pd.read_csv("C:/Users/singl/Downloads/lastfm-dataset-360K/usersha1-profile.tsv", sep='\t');
b.columns = ["User","gender","age","country","signupdate"]

# c = pd.merge(a,b,on="User", how="outer")
#Dropping missing values
a=a.dropna(axis=0)
b = b.dropna(axis=0)
#Saving to external files
a.to_csv("C:/Users/singl/Downloads/lastfm-dataset-360K/filterArt.csv")
b.to_csv("C:/Users/singl/Downloads/lastfm-dataset-360K/filterUser.csv")


