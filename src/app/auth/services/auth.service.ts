import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, catchError, map, of, tap, throwError } from 'rxjs';

import { environment } from 'src/environments/environments';
import { AuthStatus, CheckTokenResponse, LoginResponse, User } from '../interfaces';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private readonly baseUrl: string = environment.baseUrl; // http://localhost:3000, se pone readonly para que no se pueda modificar

  private http = inject(HttpClient);

  // Usando las señales
  private _currentUser = signal<User | null>( null ); // null es el valor inicial
  private _authStatus = signal<AuthStatus>( AuthStatus.checking ); // AuthStatus.checking es el valor inicial

  //! Al mundo exterior
  public currentUser = computed( () => this._currentUser() ); // computed sirve para solo leer el valor, no se puede modificar
  public authStatus = computed( () => this._authStatus() );

  constructor() {
    this.checkAuthStatus()
      .subscribe();
  }

  private setAuthentication( user: User, token: string ): boolean {
    this._currentUser.set(user); // se guarda el usuario en el currentUser
    this._authStatus.set(AuthStatus.authenticated); // se cambia el estado de la autenticación a autenticado
    localStorage.setItem('token', token); // se guarda el token en el localStorage

    return true;
  }

  login( email: string, password: string ): Observable<boolean> {

    const url = `${ this.baseUrl }/auth/login`; // http://localhost:3000/auth/login
    const body = { email: email, password: password }; // { email, password }

    return this.http.post<LoginResponse>( url, body )
      .pipe(
        map( ({ user, token }) => this.setAuthentication(user, token)),
        catchError( err => throwError( () => err.error.message ) ) // throwError sirve para lanzar un error, y catchError sirve para capturar el error
      );
  }

  checkAuthStatus(): Observable<boolean> {
    const url = `${ this.baseUrl }/auth/check-token`;
    const token = localStorage.getItem('token'); // se obtiene el token del localStorage

    if ( !token ) {
      this.logout(); // se cierra la sesión
      return of(false);
    }; // of sirve para crear un observable con un valor inicial

    const headers = new HttpHeaders()
      .set('Authorization', `Bearer ${ token }`); // se crea el header con el token

    return this.http.get<CheckTokenResponse>( url, { headers: headers } ) // se envía el header con el token
      .pipe(
        map( ({ user, token }) => this.setAuthentication(user, token)), // se guarda el usuario y el token
        // Error
        catchError( err => {
          this._authStatus.set(AuthStatus.notAuthenticated); // se cambia el estado de la autenticación a no autenticado
          return of(false);
        } )
      )
  }

  logout(): void {
    localStorage.removeItem('token'); // se borra el token del localStorage

    this._currentUser.set(null); // se borra el usuario del currentUser
    this._authStatus.set(AuthStatus.notAuthenticated); // se cambia el estado de la autenticación a no autenticado
  }


}
