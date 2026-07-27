**Poteci**

**Introducere.**  
**De ce un nou site despre traseele montane din România?**

Am contribuit si eu cu cateva trasee la harta din zona Barnova:
https://www.google.ro/maps/@47.0333617,27.6088233,12z/data=!3m1!4b1!4m2!6m1!1s1ZZ7PKAb9sYMx7fbjlX_rFC4_WBVraA74

Mă gandeam ca ar fi utilă realizarea unei baze de date electronice (formate gpx, kmz) , complete la nivel național, cu traseele omologate de salvamont, care sa permite diverse agregări și prezentări atractive. 

Așa cum a menționat și realizatorul seriei “Pe poteci, spre inima ita” majoritatea populației României consideră ca ‘la munte’ \= Valea Prahovei și Ceahlau, mai ales gratar la baza muntelui. Un procent mic din lungimea totala a traseelor marcate din România este mediatizat și propus într-un format atractiv turistilor straini și turistilor autohtoni incepatori. Consider ca siturile existente:

- [https://muntii-nostri.ro/](https://muntii-nostri.ro/)  
- [https://www.emunte.ro/](https://www.emunte.ro/)  
- altele...

se adresează doar drumetilor cu o experienta cel puțin medie. 99% din populatia Romaniei și din străinătate dorește o plimbare de weekend ca un antrenament de fitness in aer liber unde sa faca cateva poze. Ce nu dorește un om din marea masa de oameni care utilizează internetul pentru idei de weekend/activități este sa investească în echipament semi(profesionist), sa petreaca 5 zile nespalat în cort la 0 grade, sa mancare rece 3 mese pe zi, pe scurt disconfortul general propus de drumetia promovată de aceste situri existente. Nu cred în capacitatea acestor situri de a atrage ‘pantofari’. Ele reprezintă mai mult o sursa de date pentru turiști mai experimentați care organizeaza drumetii.

Aceste situri nu reprezinta un ghid simplu de urmat pentru organizarea unei drumetii:

* un ‘pantofar’ are nevoie de indicații clare: unde poate lăsa mașina și de unde începe traseul marcat pe care să-l urmez.  
* nu trebuie oferite variante inutilizabile de către un om care nu este dispus la discomfort: variante fără posibilități de cazare, fara apa, variante în care traseul sfarseste departe de locul în care ai lăsat mașina...

**Ce își propune noul site?**  
Acest site își propune sa descongestiona Valea Prahovei și Ceahlăul prin facilitarea organizării de drumetii de către simpli ‘pantofari’ , lipsiti de experienta, care-și doresc o soluție facilă și sigură de petrecerea unei zile de weekend. **Deasemenea se încearcă realizarea unei baze de date cat mai exhaustive de poteci marcate intr-un format care sa permita diverse agregari/prezentari.** Ar fi necesara iregistrarea tuturor potecilor omologate din Romania in format gpx, kmz, klm… 

**Ecranele aplicației:**  
(În acest moment aplicația oferă functionalitati de baza și este construită pe model server \- client utilizand o baza de date relațională in memory. Deocamdată prezentarea se adresează doar telefoanelor mobile)


Prezinta 4 tipuri de drumetie care isi propun sa acopere gusturile tuturor începătorilor, pantofilor, interesați de o ieșire la munte, fara pretentii (semi)profesioniste / sportive. În ordinea crescătoare a duratei:

* ‘Plimbare’ \- plimbări ușoare care nu necesita echipament profesionist și cazare.  
* ‘Drumetie de zi’ \- drumetii de o zi care nu necesita cazare.  
* ‘Weekend margareta’ \- Drumetii de weekend, de dificultate medie, cu posibilități de cazare în regim de pensiune.  
* ‘Weekend stea’ \- Plimbări de weekend cu posibilități de cazare într-un regim de confort sporit.

Se observa din start ca sistemul nu se adresează drumetilor experimentați care doresc sa mearga 5 zile cu cortul, ci turistilor de weekend (mult mai numerosi).  
![][image1]

**Pagina lista trasee:**  
[https://poteca.herokuapp.com/trails/1](https://poteca.herokuapp.com/dashboard) 

**![][image2]**  
După selectarea tipului de plimbare dorit (in pagina ‘acasa’) aplicația va prezenta lista traseelor de acest tip din apropierea orașului utilizatorului. Va fi afișată și vremea strict pentru următorul weekend. Deoarece turistii de weekend sunt publicul nostru țintă sistemul nu va propune deplasări lungi cu mașina (trenul), ci trasee din apropierea unui oraș mare ales de utilizator.  Plimbarile pot fi ordonate după durata prin apasarea capului din coloana tabelului. Structura dinamica a bazei de date (care stocheaza segmente de poteca) permite agregarea lor în mod dinamic și crearea de diverse soluții ca durata, din care cele mai interesante sunt de tip ‘circuit’ pentru a permite utilizatorilor sa se intoarca în același loc unde au lăsat mașina.

**Pagina detaliu traseu:**  
[https://poteca.herokuapp.com/detail/bar-2](https://poteca.herokuapp.com/dashboard) 

![][image3]  
La selectarea unui traseu din tabel sunt afișate detaliile: 

* descrierea completă și clară a locului de intrare în traseul marcat.  
* Imagini  
* Descriera întregului traseu  
* Fauna si flora  
* Avertismente (interzis iarna, animale, lipsa apa, etc..)

**Detalii tehnice:**  
Codul se găsește aici:  
Server: [https://github.com/ebreaur/poteci](https://github.com/ebreaur/poteci)  
Client: [https://github.com/ebreaur/pantofar](https://github.com/ebreaur/pantofar)

Tehnologii folosite:  
Angular 11, Node JS, Express, Sqlite
